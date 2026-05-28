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

const { mockTx, mockPrisma, mockStripeRefunds, mockCreateOrderAuditTx } = vi.hoisted(() => {
	const mockTx = {
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
			refund: { update: vi.fn() },
		},
		mockStripeRefunds: { create: vi.fn() },
		mockCreateOrderAuditTx: vi.fn(),
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
			restock: boolean;
		}>;
		expect(items).toHaveLength(2);
		// restock=false : stock déjà restauré par restoreStockForOrder lors de payment_failed
		expect(items.every((i) => i.restock === false)).toBe(true);
		// sum(amount) doit couvrir le total
		expect(items.reduce((acc, i) => acc + i.amount, 0)).toBe(5000);
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

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "ref-auto-1" },
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
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
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
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});
});
