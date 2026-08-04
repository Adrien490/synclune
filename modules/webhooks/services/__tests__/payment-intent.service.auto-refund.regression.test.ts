/**
 * @regression ORD-BIZ-002
 *
 * Garantit que `initiateAutomaticRefund` crée un `Refund` local APPROVED avec
 * `RefundItems` couvrant tous les `OrderItem` AVANT l'appel Stripe, et que
 * `metadata.refund_id` est passé à Stripe pour permettre au webhook
 * `charge.refunded` de matcher via `linkRefund` (et non `upsertDashboard`).
 *
 * Sans cette régression : l'auto-refund webhook payment_failed crée un Refund
 * Stripe sans Refund local, puis `charge.refunded` tombe en branche Dashboard
 * → restock perdu, traçabilité items dégradée.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockTx,
	mockPrisma,
	mockStripeRefunds,
	mockCreateOrderAuditTx,
	mockSentryCaptureMessage,
	FakePrismaKnownRequestError,
} = vi.hoisted(() => {
	const mockTx = {
		// IDEM-AUTOREFUND-001 : `SELECT … FOR UPDATE` de sérialisation en tête de tx.
		$queryRaw: vi.fn(),
		refund: {
			findFirst: vi.fn(),
			create: vi.fn(),
		},
		order: {
			findUniqueOrThrow: vi.fn(),
		},
		orderHistory: { create: vi.fn() },
	};
	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
			// IDEM-AUTOREFUND-001 : le lien stripeRefundId passe par un claim
			// conditionnel `updateMany({ stripeRefundId: null })`.
			refund: { update: vi.fn(), updateMany: vi.fn() },
		},
		mockStripeRefunds: { create: vi.fn() },
		mockCreateOrderAuditTx: vi.fn(),
		mockSentryCaptureMessage: vi.fn(),
		// Vraie classe d'erreur Prisma (voir le mock du client plus bas).
		FakePrismaKnownRequestError: class FakePrismaKnownRequestError extends Error {
			code: string;
			constructor(message: string, { code }: { code: string }) {
				super(message);
				this.name = "PrismaClientKnownRequestError";
				this.code = code;
			}
		},
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: { refunds: mockStripeRefunds },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	// IDEM-AUTOREFUND-001 : subclass RÉELLE obligatoire. Un
	// `Object.assign(new Error(), { code: "P2002" })` n'est PAS `instanceof` →
	// la branche P2002 de `initiateAutomaticRefund` ne serait jamais exécutée et le
	// test passerait « green for the wrong reason » (incident webhooks-audit-2026-05-17).
	Prisma: { PrismaClientKnownRequestError: FakePrismaKnownRequestError },
	HistorySource: { WEBHOOK: "WEBHOOK", ADMIN: "ADMIN", SYSTEM: "SYSTEM" },
	OrderAction: {
		REFUND_CREATED: "REFUND_CREATED",
		REFUND_COMPLETED: "REFUND_COMPLETED",
		PAID: "PAID",
		CANCELLED: "CANCELLED",
	},
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		DEFECTIVE: "DEFECTIVE",
		WRONG_ITEM: "WRONG_ITEM",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("@/modules/discounts/services/release-order-discount-usage.service", () => ({
	releaseOrderDiscountUsageTx: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: { USAGE: (id: string) => `discount-usage-${id}` },
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: vi.fn(),
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: vi.fn(),
	ROUTES: { ADMIN: { ORDER_DETAIL: (id: string) => `/admin/${id}` } },
}));

vi.mock("@/modules/webhooks/constants/webhook.constants", () => ({
	SYSTEM_AUTHOR_ID: "00000000-0000-0000-0000-000000000000",
}));

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

vi.mock("@sentry/nextjs", () => ({
	withScope: (cb: (scope: unknown) => void) =>
		cb({
			setLevel: vi.fn(),
			setTag: vi.fn(),
			setFingerprint: vi.fn(),
			setContext: vi.fn(),
		}),
	captureMessage: mockSentryCaptureMessage,
	// `shared/lib/logger` appelle addBreadcrumb (warn/info) et captureException
	// (error) : sans ces exports, le mock fait exploser la branche même qu'on teste
	// et l'erreur remonte au catch global → faux négatif difficile à lire.
	captureException: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

import { initiateAutomaticRefund } from "../payment-intent.service";

describe("ORD-BIZ-002 — initiateAutomaticRefund crée un Refund local lié à Stripe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
		mockTx.refund.findFirst.mockResolvedValue(null);
		mockTx.order.findUniqueOrThrow.mockResolvedValue({
			total: 5000,
			items: [
				{ id: "oi-1", price: 3000, quantity: 1 },
				{ id: "oi-2", price: 1000, quantity: 2 },
			],
		});
		mockTx.refund.create.mockResolvedValue({
			id: "ref-auto-1",
			status: "APPROVED",
			stripeRefundId: null,
		});
		mockStripeRefunds.create.mockResolvedValue({ id: "re_stripe_auto_1" });
	});

	it("crée un Refund local APPROVED avec items.length = order.items.length AVANT le call Stripe", async () => {
		const result = await initiateAutomaticRefund("pi_test_1", "order-1", "payment_failed");

		expect(result.success).toBe(true);
		expect(mockTx.refund.create).toHaveBeenCalledTimes(1);

		const createPayload = mockTx.refund.create.mock.calls[0]?.[0];
		expect(createPayload.data.orderId).toBe("order-1");
		expect(createPayload.data.amount).toBe(5000);
		expect(createPayload.data.status).toBe("APPROVED");
		expect(createPayload.data.reason).toBe("OTHER");

		const items = createPayload.data.items.create as Array<{
			orderItemId: string;
			quantity: number;
			amount: number;
		}>;
		expect(items).toHaveLength(2);
		// Aucune instruction de restock (colonne droppée au Lot 6) : le stock est
		// déjà restauré par restoreStockForOrder lors de payment_failed.
		expect(items.every((i) => !("restock" in i))).toBe(true);
		// sum(amount) doit couvrir le total
		expect(items.reduce((acc, i) => acc + i.amount, 0)).toBe(5000);
	});

	it("Audit F2 — le Refund local porte amount_received quand il diffère d'order.total (underbilling)", async () => {
		// Stripe a encaissé 4000 pour une commande à 5000 (AmountMismatchError).
		// L'appel stripe.refunds.create sans `amount` rembourse le montant capturé :
		// le Refund local doit refléter 4000, pas order.total (sinon la compta
		// interne et l'e-reporting REFUND sur-évaluent le remboursement).
		const result = await initiateAutomaticRefund("pi_under_1", "order-1", "amount_mismatch", 4000);

		expect(result.success).toBe(true);
		const createPayload = mockTx.refund.create.mock.calls[0]?.[0];
		expect(createPayload.data.amount).toBe(4000);

		const auditPayload = mockCreateOrderAuditTx.mock.calls[0]?.[1];
		expect(auditPayload.metadata.amount).toBe(4000);
	});

	it("passe metadata.refund_id à Stripe pour matching webhook charge.refunded", async () => {
		await initiateAutomaticRefund("pi_test_2", "order-1", "payment_failed");

		expect(mockStripeRefunds.create).toHaveBeenCalledWith(
			expect.objectContaining({
				payment_intent: "pi_test_2",
				metadata: expect.objectContaining({
					orderId: "order-1",
					refund_id: "ref-auto-1",
				}),
			}),
			expect.objectContaining({
				idempotencyKey: "auto-refund-pi_test_2",
			}),
		);
	});

	it("update Refund local avec stripeRefundId APRÈS le call Stripe réussi", async () => {
		await initiateAutomaticRefund("pi_test_3", "order-1", "payment_failed");

		// IDEM-AUTOREFUND-001 : claim conditionnel — le `stripeRefundId: null` dans le
		// `where` empêche d'écraser un lien déjà posé par un concurrent ou par le
		// webhook charge.refunded.
		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: "ref-auto-1", stripeRefundId: null },
			data: { stripeRefundId: "re_stripe_auto_1" },
		});
	});

	it("est idempotent : ne re-crée pas de Refund si auto-refund existe déjà pour cet ordre", async () => {
		mockTx.refund.findFirst.mockResolvedValue({
			id: "ref-auto-existing",
			status: "APPROVED",
			stripeRefundId: "re_stripe_already_linked",
		});

		await initiateAutomaticRefund("pi_test_4", "order-1", "payment_failed");

		expect(mockTx.refund.create).not.toHaveBeenCalled();
		// Si stripeRefundId déjà posé, pas de re-update
		expect(mockPrisma.refund.updateMany).not.toHaveBeenCalled();
		// Le call Stripe est toujours fait (idempotency Stripe gère la dédup côté provider)
		expect(mockStripeRefunds.create).toHaveBeenCalledTimes(1);
	});

	it("crée une entrée OrderHistory REFUND_CREATED avec metadata.automatic=true", async () => {
		await initiateAutomaticRefund("pi_test_5", "order-1", "payment_failed");

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockTx,
			expect.objectContaining({
				orderId: "order-1",
				action: "REFUND_CREATED",
				source: "WEBHOOK",
				metadata: expect.objectContaining({
					refundId: "ref-auto-1",
					paymentIntentId: "pi_test_5",
					automatic: true,
				}),
			}),
		);
	});

	it("retourne success=false si l'appel Stripe échoue (Refund local reste APPROVED pour cron reconcile)", async () => {
		mockStripeRefunds.create.mockRejectedValue(new Error("Stripe API down"));

		const result = await initiateAutomaticRefund("pi_test_6", "order-1", "payment_failed");

		expect(result.success).toBe(false);
		expect(result.error?.message).toBe("Stripe API down");
		// Refund local créé : OK (cron reconcile-refunds rattrapera)
		expect(mockTx.refund.create).toHaveBeenCalledTimes(1);
		// Pas d'update stripeRefundId puisque le call Stripe a failed
		expect(mockPrisma.refund.updateMany).not.toHaveBeenCalled();
	});
});

// ============================================================================
// @regression idem-autorefund-001
//
// La garde de doublon d'`initiateAutomaticRefund` est un `findFirst` sur préfixe de
// note, sans contrainte d'unicité adossée. Deux exécutions concurrentes créaient
// donc 2 `Refund` locaux pour UN seul `re_*` Stripe (la clé d'idempotence
// `auto-refund-${pi}` est stable → pas de double débit), et le 2ᵉ lien heurtait
// `Refund.stripeRefundId @unique` en P2002 NON CATCHÉ. Conséquences :
//   - l'échec était rapporté en `{ success: false }` alors que l'argent était parti,
//   - l'orphelin APPROVED / stripeRefundId=null gonflait `alreadyRefunded` et
//     bouclait dans la DLQ `reconcile-refunds` jusqu'à l'alerte « remboursement
//     manuel requis » — invitant un opérateur à rembourser une 2ᵉ fois.
//
// Deux garanties verrouillées ici : (1) la tx sérialise sur la ligne Order pour
// rendre la garde autoritative ; (2) un P2002 résiduel sur le lien n'échoue PAS
// l'opération, il alerte.
// ============================================================================
describe("@regression idem-autorefund-001", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
		mockTx.refund.findFirst.mockResolvedValue(null);
		mockTx.order.findUniqueOrThrow.mockResolvedValue({
			total: 5000,
			items: [{ id: "oi-1", price: 5000, quantity: 1 }],
		});
		mockTx.refund.create.mockResolvedValue({
			id: "ref-auto-1",
			status: "APPROVED",
			stripeRefundId: null,
		});
		mockStripeRefunds.create.mockResolvedValue({ id: "re_stripe_auto_1" });
	});

	it("sérialise sur la ligne Order (SELECT … FOR UPDATE) avant la garde de doublon", async () => {
		await initiateAutomaticRefund("pi_lock", "order-1", "payment_failed");

		expect(mockTx.$queryRaw).toHaveBeenCalled();
		const sql = mockTx.$queryRaw.mock.calls[0]?.[0]?.join?.("?") ?? "";
		expect(sql).toContain('FROM "Order"');
		expect(sql).toContain("FOR UPDATE");
	});

	it("résout la garde de façon déterministe (orderBy createdAt asc)", async () => {
		await initiateAutomaticRefund("pi_det", "order-1", "payment_failed");

		expect(mockTx.refund.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: { createdAt: "asc" } }),
		);
	});

	it("P2002 sur le lien (doublon résiduel) → success=true + alerte, PAS un échec", async () => {
		mockPrisma.refund.updateMany.mockRejectedValue(
			new FakePrismaKnownRequestError("Unique constraint failed", { code: "P2002" }),
		);

		const result = await initiateAutomaticRefund("pi_dup", "order-1", "payment_failed");

		// L'argent EST parti (clé Stripe stable) → ne pas rapporter un échec, sinon la
		// DLQ relance et un opérateur peut rembourser une 2ᵉ fois.
		expect(result).toEqual({ success: true, refundId: "re_stripe_auto_1" });
		expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
			expect.stringContaining("Doublon de Refund local"),
			"warning",
		);
	});

	it("une erreur DB non-P2002 sur le lien reste propagée (pas d'avalement)", async () => {
		mockPrisma.refund.updateMany.mockRejectedValue(
			new FakePrismaKnownRequestError("Connection lost", { code: "P1001" }),
		);

		const result = await initiateAutomaticRefund("pi_db_down", "order-1", "payment_failed");

		expect(result.success).toBe(false);
		expect(result.error?.message).toBe("Connection lost");
		expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
	});
});
