/**
 * Couverture de `handleDisputeFundsWithdrawn` / `handleDisputeFundsReinstated`
 * (et du `handleDisputeFundsFlow` partagé, ~110 lignes).
 *
 * Relevé par l'audit webhooks 2026-07-26 : ces trois fonctions n'avaient AUCUN
 * test unitaire — seul le contract test vérifiait leur routage, handler mocké.
 * Restaient donc non couverts la capture de frais P2-C (`balance_transactions`,
 * ~15 € par litige) et la garde no-op qui absorbe un `funds_withdrawn` livré
 * AVANT `charge.dispute.created` — soit précisément de la logique d'ordre
 * d'événements, la plus difficile à reproduire en production.
 *
 * Fichier volontairement autonome (pas d'extension de `dispute-handlers.test.ts`)
 * pour isoler ce périmètre de son rig de mocks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockTx, mockCreateOrderAuditTx, mockCaptureWebhookError } = vi.hoisted(() => {
	const tx = {
		orderNote: { create: vi.fn() },
		dispute: { updateMany: vi.fn() },
	};
	return {
		mockTx: tx,
		mockPrisma: {
			order: { findFirst: vi.fn() },
			orderNote: { findFirst: vi.fn() },
			$transaction: vi.fn(),
		},
		mockCreateOrderAuditTx: vi.fn(),
		mockCaptureWebhookError: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: vi.fn(),
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	startSpan: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../utils/capture-webhook-error", () => ({
	captureWebhookError: mockCaptureWebhookError,
}));

// Chaînes lourdes (UploadThing à l'import) inutiles sur ce flux.
vi.mock("@/modules/orders/services/void-invoice.service", () => ({ voidInvoice: vi.fn() }));
vi.mock("@/modules/refunds/services/issue-credit-note.service", () => ({
	issueCreditNoteForRefund: vi.fn(),
}));

import { handleDisputeFundsWithdrawn, handleDisputeFundsReinstated } from "../dispute-handlers";

type DisputeLike = Parameters<typeof handleDisputeFundsWithdrawn>[0];

function buildDispute(overrides: Record<string, unknown> = {}): DisputeLike {
	return {
		id: "dp_123",
		payment_intent: "pi_123",
		amount: 4500,
		balance_transactions: [],
		...overrides,
	} as unknown as DisputeLike;
}

describe("handleDisputeFundsFlow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.orderNote.create.mockResolvedValue({});
		mockTx.dispute.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation(async (cb: (t: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
		mockPrisma.order.findFirst.mockResolvedValue({ id: "order-1", orderNumber: "SYN-001" });
		mockPrisma.orderNote.findFirst.mockResolvedValue(null);
	});

	describe("garde-fous d'entrée", () => {
		it("throw quand le dispute n'a pas de payment_intent (rien à rattacher)", async () => {
			await expect(
				handleDisputeFundsWithdrawn(buildDispute({ payment_intent: null })),
			).rejects.toThrow(/no payment_intent/);
			expect(mockCaptureWebhookError).toHaveBeenCalled();
		});

		it("résout le payment_intent quand Stripe l'expand en objet", async () => {
			await handleDisputeFundsWithdrawn(buildDispute({ payment_intent: { id: "pi_expanded" } }));

			expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ stripePaymentIntentId: "pi_expanded" }),
				}),
			);
		});

		it("skip sans muter quand aucune commande ne correspond", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(null);

			const result = await handleDisputeFundsWithdrawn(buildDispute());

			expect(result).toEqual({
				success: true,
				skipped: true,
				reason: "Order not found for dispute withdrawn",
			});
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});

		it("skip quand la note existe déjà (anti-replay sur redélivrance Stripe)", async () => {
			mockPrisma.orderNote.findFirst.mockResolvedValue({ id: "note-1" });

			const result = await handleDisputeFundsReinstated(buildDispute());

			expect(result).toEqual({
				success: true,
				skipped: true,
				reason: "Dispute reinstated note already created",
			});
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});
	});

	describe("P2-C — capture de la fee de litige", () => {
		it("persiste la fee présente dans balance_transactions au retrait des fonds", async () => {
			await handleDisputeFundsWithdrawn(buildDispute({ balance_transactions: [{ fee: 1500 }] }));

			expect(mockTx.dispute.updateMany).toHaveBeenCalledWith({
				where: { stripeDisputeId: "dp_123", fee: 0 },
				data: { fee: 1500 },
			});
		});

		it("n'écrase JAMAIS une fee déjà posée (prédicat fee: 0 dans le where)", async () => {
			await handleDisputeFundsWithdrawn(buildDispute({ balance_transactions: [{ fee: 1500 }] }));

			const where = mockTx.dispute.updateMany.mock.calls[0]![0].where;
			expect(where.fee).toBe(0);
		});

		it("ORDRE D'ÉVÉNEMENTS : funds_withdrawn avant created ⇒ updateMany no-op, pas de throw", async () => {
			// Le Dispute n'existe pas encore : updateMany matche 0 ligne. Un `update`
			// aurait levé un P2025 et fait échouer tout le flux (note + audit perdus).
			mockTx.dispute.updateMany.mockResolvedValue({ count: 0 });

			const result = await handleDisputeFundsWithdrawn(
				buildDispute({ balance_transactions: [{ fee: 1500 }] }),
			);

			expect(result?.success).toBe(true);
			expect(mockTx.orderNote.create).toHaveBeenCalledTimes(1);
			expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
		});

		it("n'écrit aucune fee quand balance_transactions est vide", async () => {
			await handleDisputeFundsWithdrawn(buildDispute({ balance_transactions: [] }));

			expect(mockTx.dispute.updateMany).not.toHaveBeenCalled();
		});

		it("ne capte JAMAIS de fee sur reinstated (la fee appartient au retrait)", async () => {
			await handleDisputeFundsReinstated(buildDispute({ balance_transactions: [{ fee: 1500 }] }));

			expect(mockTx.dispute.updateMany).not.toHaveBeenCalled();
		});
	});

	describe("traçabilité", () => {
		it("écrit note + audit dans la MÊME transaction, avec le préfixe propre au flux", async () => {
			await handleDisputeFundsWithdrawn(buildDispute());

			expect(mockTx.orderNote.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						orderId: "order-1",
						content: expect.stringContaining("[LITIGE FONDS RETIRÉS] Litige dp_123"),
					}),
				}),
			);
			expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
				mockTx,
				expect.objectContaining({
					orderId: "order-1",
					action: "DISPUTE_RESOLVED",
					source: "WEBHOOK",
					metadata: expect.objectContaining({
						stripeDisputeId: "dp_123",
						event: "funds_withdrawn",
					}),
				}),
			);
		});

		it("distingue le libellé restitué du libellé retiré", async () => {
			await handleDisputeFundsReinstated(buildDispute());

			expect(mockTx.orderNote.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						content: expect.stringContaining("[LITIGE FONDS RESTITUÉS] Litige dp_123"),
					}),
				}),
			);
		});

		it("émet une task INVALIDATE_CACHE ciblant liste, notes et badges admin", async () => {
			const result = await handleDisputeFundsWithdrawn(buildDispute());

			expect(result?.tasks).toHaveLength(1);
			const task = result!.tasks![0]!;
			expect(task.type).toBe("INVALIDATE_CACHE");
			expect(task).toHaveProperty("tags");
		});
	});
});
