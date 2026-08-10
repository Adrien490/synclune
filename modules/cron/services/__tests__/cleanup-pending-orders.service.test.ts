import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockUpdateTag, mockCreateOrderAuditTx, mockSendAdminCronFailedAlert } =
	vi.hoisted(() => ({
		mockPrisma: {
			order: {
				findMany: vi.fn(),
				findUnique: vi.fn(),
				update: vi.fn(),
				count: vi.fn(),
				// Claim de libération du code promo (audit V2, Lot 2).
				updateMany: vi.fn(),
			},
			productSku: { update: vi.fn() },
			discount: { update: vi.fn(), updateMany: vi.fn() },
			// WEBHOOK-AUDIT-003 : passe de rétention des artefacts webhook.
			postWebhookTask: { findMany: vi.fn(), deleteMany: vi.fn() },
			webhookEvent: { findMany: vi.fn(), deleteMany: vi.fn() },
			$transaction: vi.fn(),
		},
		mockUpdateTag: vi.fn(),
		mockCreateOrderAuditTx: vi.fn(),
		mockSendAdminCronFailedAlert: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

// Ce service s'execute en contexte route handler (cron/webhook) : il invalide via
// `revalidateTagsInBackground` -> `revalidateTag(tag, { expire: 0 })`, car
// `updateTag` y throw (E872). Les DEUX sont routes vers le meme espion : ce que
// ces tests verifient, c'est QUELS tags sont invalides. Le choix de l'API selon le
// contexte est prouve, lui, sans mock, par
// `test/contract/cache-invalidation-context.contract.test.ts`.
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	revalidateTag: (tag: string) => mockUpdateTag(tag),
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

// AM-5 : tripwire SPOF sync-async-payments.
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

import { cleanupPendingOrders } from "../cleanup-pending-orders.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

interface StaleOrderFixture {
	id: string;
	orderNumber: string;
	createdAt: Date;
	userId: string | null;
	items: Array<{ id: string; skuId: string; quantity: number }>;
}

function buildStaleOrder(overrides: Partial<StaleOrderFixture> = {}): StaleOrderFixture {
	return {
		id: overrides.id ?? "order-1",
		orderNumber: overrides.orderNumber ?? "SYN-001",
		createdAt: overrides.createdAt ?? new Date("2026-02-07T12:00:00Z"),
		userId: overrides.userId ?? null,
		items: overrides.items ?? [{ id: "item-1", skuId: "sku-1", quantity: 2 }],
	};
}

function mockTransactionResolves(): void {
	mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => {
		mockPrisma.order.findUnique.mockResolvedValue({
			status: "PENDING",
			paymentStatus: "PENDING",
			stripePaymentIntentId: null,
		});
		return cb(mockPrisma);
	});
}

describe("cleanupPendingOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
		// AM-5 : par défaut aucun PENDING PI anormalement vieux (tripwire silencieux).
		mockPrisma.order.count.mockResolvedValue(0);
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		// WEBHOOK-AUDIT-003 : rien à purger par défaut.
		mockPrisma.postWebhookTask.findMany.mockResolvedValue([]);
		mockPrisma.webhookEvent.findMany.mockResolvedValue([]);
		mockPrisma.postWebhookTask.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.deleteMany.mockResolvedValue({ count: 0 });
	});

	it("returns zero counts when no candidates exist", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await cleanupPendingOrders();

		expect(result).toMatchObject({
			processed: 0,
			errored: 0,
			skipped: 0,
			cancelled: 0,
			hasMore: false,
		});
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("queries orders older than the timeout and excludes Stripe-tracked ones", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		await cleanupPendingOrders();

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(call.where.status).toBe("PENDING");
		expect(call.where.paymentStatus).toBe("PENDING");
		expect(call.where.stripePaymentIntentId).toBeNull();
		expect(call.where.deletedAt).toBeNull();

		const cutoff = new Date(Date.now() - THRESHOLDS.PENDING_ORDER_TIMEOUT_MS);
		expect(call.where.createdAt.lt.getTime()).toBe(cutoff.getTime());
		expect(call.orderBy).toEqual({ createdAt: "asc" });
	});

	// STOCK-01 : une commande PENDING n'a jamais décrémenté son stock → on annule
	// sans restocker (sinon phantom stock).
	it("cancels a stale order WITHOUT restoring stock, and writes an audit entry", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildStaleOrder()]);
		mockTransactionResolves();

		const result = await cleanupPendingOrders();

		expect(result.processed).toBe(1);
		expect(result.errored).toBe(0);
		expect(result.cancelled).toBe(1);

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { status: "CANCELLED" },
		});
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				orderId: "order-1",
				action: "CANCELLED",
				previousStatus: "PENDING",
				newStatus: "CANCELLED",
				source: "SYSTEM",
				authorName: "Système",
				metadata: expect.objectContaining({
					reason: "abandoned_checkout",
					itemsCount: 1,
				}),
			}),
		);
	});

	it("skips an order whose status changed between fetch and transaction (TOCTOU guard)", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildStaleOrder()]);
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => {
			mockPrisma.order.findUnique.mockResolvedValue({
				status: "PROCESSING",
				paymentStatus: "PAID",
				stripePaymentIntentId: "pi_xxx",
			});
			return cb(mockPrisma);
		});

		const result = await cleanupPendingOrders();

		expect(result.processed).toBe(1);
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	it("invalidates LIST, ADMIN_ORDERS_LIST, ADMIN_BADGES when at least one order is cancelled", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildStaleOrder()]);
		mockTransactionResolves();

		await cleanupPendingOrders();

		const tags = mockUpdateTag.mock.calls.map((c) => c[0]);
		expect(tags).toEqual(
			expect.arrayContaining(["orders-list", "admin-orders-list", "admin-badges"]),
		);
		// STOCK-01 : plus de restock → aucun tag de stock SKU émis.
		expect(tags).not.toContain("sku-stock-sku-1");
	});

	// CACHE-AUDIT-005 : un pending abandonné d'un client connecté doit invalider
	// ses tags user-scopés + le détail commande.
	it("invalidates user-scoped + order-detail tags when the cancelled order belongs to a user", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildStaleOrder({ userId: "user-7" })]);
		mockTransactionResolves();

		await cleanupPendingOrders();

		const tags = mockUpdateTag.mock.calls.map((c) => c[0]);
		expect(tags).toEqual(expect.arrayContaining(["order-detail-order-1"]));
		// Plus de tag user-scopé (retrait de l'espace client 2026-07-31).
		expect(tags.some((t: string) => t.startsWith("orders-user-"))).toBe(false);
	});

	// === AM-5 : tripwire SPOF sync-async-payments ===

	it("does NOT alert when no PENDING PaymentIntent order is abnormally old", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.order.count.mockResolvedValue(0);

		await cleanupPendingOrders();

		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});

	it("alerts admin when PENDING PaymentIntent orders are older than 7 days (sync-async SPOF)", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.order.count.mockResolvedValue(3);

		await cleanupPendingOrders();

		// Tripwire en lecture seule : compte les PENDING à PI > 7j, n'agit pas dessus.
		const countCall = mockPrisma.order.count.mock.calls[0]![0];
		expect(countCall.where.status).toBe("PENDING");
		expect(countCall.where.paymentStatus).toBe("PENDING");
		expect(countCall.where.stripePaymentIntentId).toEqual({ not: null });

		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				errors: 3,
				details: expect.objectContaining({ issue: "stale-pending-pi-orders" }),
			}),
		);
	});

	it("counts errors when a transaction throws and continues with the next order", async () => {
		mockPrisma.order.findMany.mockResolvedValue([
			buildStaleOrder({ id: "order-fail" }),
			buildStaleOrder({ id: "order-ok", orderNumber: "SYN-002" }),
		]);
		mockPrisma.$transaction
			.mockRejectedValueOnce(new Error("DB down"))
			.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => {
				mockPrisma.order.findUnique.mockResolvedValue({
					status: "PENDING",
					paymentStatus: "PENDING",
					stripePaymentIntentId: null,
				});
				return cb(mockPrisma);
			});

		const result = await cleanupPendingOrders();

		expect(result.errored).toBe(1);
		expect(result.processed).toBe(1);
	});

	// WEBHOOK-AUDIT-003 — le cron dédié `cleanup-webhook-events` a été retiré au
	// right-sizing sans remplaçant : WebhookEvent et PostWebhookTask croissaient
	// sans borne, la première étant sur le chemin chaud de l'idempotence (lookup
	// `stripeEventId @unique` à chaque livraison Stripe).
	describe("WEBHOOK-AUDIT-003 — passe de rétention des artefacts webhook", () => {
		beforeEach(() => {
			mockPrisma.order.findMany.mockResolvedValue([]);
		});

		// Lot 2 S3.4 : la purge des PostWebhookTask est partie avec la file — seule
		// la rétention des WebhookEvent résolus subsiste.
		it("ne purge QUE les événements résolus, au-delà du seuil de rétention", async () => {
			await cleanupPendingOrders();

			const cutoff = new Date(Date.now() - THRESHOLDS.WEBHOOK_RECORD_RETENTION_MS);

			const eventWhere = mockPrisma.webhookEvent.findMany.mock.calls[0]![0].where;
			// Un FAILED reste éligible au rejeu (bouton Maintenance retry-webhooks)
			// ou documente un incident.
			expect(eventWhere.status).toEqual({ in: ["COMPLETED", "SKIPPED"] });
			expect(eventWhere.receivedAt.lt.getTime()).toBe(cutoff.getTime());
		});

		it("supprime par identifiants et remonte le total dans le résultat du cron", async () => {
			mockPrisma.webhookEvent.findMany.mockResolvedValue([{ stripeEventId: "evt_1" }]);
			mockPrisma.webhookEvent.deleteMany.mockResolvedValue({ count: 1 });

			await cleanupPendingOrders();

			expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenCalledWith({
				where: { stripeEventId: { in: ["evt_1"] } },
			});
		});

		it("un échec de purge ne fait pas échouer l'annulation des commandes", async () => {
			// La purge est accessoire : la raison d'être du cron reste l'annulation.
			mockPrisma.webhookEvent.findMany.mockRejectedValue(new Error("DB down"));

			await expect(cleanupPendingOrders()).resolves.toMatchObject({ errored: 0 });
		});
	});
});
