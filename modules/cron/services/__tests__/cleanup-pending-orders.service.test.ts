import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockStripe, mockGetStripeClient, mockUpdateTag, mockSendAdminCronFailedAlert } =
	vi.hoisted(() => ({
		mockPrisma: {
			order: { findMany: vi.fn() },
			$transaction: vi.fn(),
		},
		mockStripe: {
			paymentIntents: { retrieve: vi.fn() },
		},
		mockGetStripeClient: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockSendAdminCronFailedAlert: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/stripe", () => ({
	getStripeClient: mockGetStripeClient,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_ORDERS_LIST: "admin-orders-list",
		ADMIN_BADGES: "admin-badges",
	},
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: {
		USAGE: (id: string) => `discount-usage-${id}`,
	},
}));

vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_SIZE_MEDIUM: 25,
	STRIPE_THROTTLE_MS: 0,
	STRIPE_TIMEOUT_MS: 0,
	BATCH_DEADLINE_MS: 50_000,
	PENDING_ORDER_MAX_AGE_MS: 30 * 60 * 1000,
}));

import { cleanupPendingOrders } from "../cleanup-pending-orders.service";

// ============================================================================
// Helpers
// ============================================================================

function makeOrder(
	overrides?: Partial<{ id: string; orderNumber: string; stripePaymentIntentId: string | null }>,
) {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		stripePaymentIntentId: "pi_test_1",
		...overrides,
	};
}

function makeTx(
	overrides?: Partial<{
		orderPaymentStatus: string;
		discountUsages: { id: string; discountId: string }[];
	}>,
) {
	const { orderPaymentStatus = "PENDING", discountUsages = [] } = overrides ?? {};

	return {
		order: {
			findUnique: vi.fn().mockResolvedValue({ paymentStatus: orderPaymentStatus }),
			update: vi.fn().mockResolvedValue(undefined),
		},
		discountUsage: {
			findMany: vi.fn().mockResolvedValue(discountUsages),
			deleteMany: vi.fn().mockResolvedValue(undefined),
		},
		discount: {
			update: vi.fn().mockResolvedValue(undefined),
		},
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("cleanupPendingOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T10:00:00Z"));
		mockGetStripeClient.mockReturnValue(mockStripe);
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
	});

	describe("Stripe config check", () => {
		it("should return null when Stripe is not configured", async () => {
			mockGetStripeClient.mockReturnValue(null);

			const result = await cleanupPendingOrders();

			expect(result).toBeNull();
		});

		it("should not query the database when Stripe is not configured", async () => {
			mockGetStripeClient.mockReturnValue(null);

			await cleanupPendingOrders();

			expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
		});
	});

	describe("empty results", () => {
		it("should return zero counts when no pending orders exist", async () => {
			mockPrisma.order.findMany.mockResolvedValue([]);

			const result = await cleanupPendingOrders();

			expect(result).toEqual({ checked: 0, cancelled: 0, errors: 0, hasMore: false });
		});

		it("should not invalidate cache when no orders are cancelled", async () => {
			mockPrisma.order.findMany.mockResolvedValue([]);

			await cleanupPendingOrders();

			expect(mockUpdateTag).not.toHaveBeenCalled();
		});

		it("should not send admin alert when there are no errors", async () => {
			mockPrisma.order.findMany.mockResolvedValue([]);

			await cleanupPendingOrders();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("query filters", () => {
		it("should query orders with correct payment and order status filters", async () => {
			mockPrisma.order.findMany.mockResolvedValue([]);

			await cleanupPendingOrders();

			const call = mockPrisma.order.findMany.mock.calls[0]![0];
			expect(call.where.paymentStatus).toBe("PENDING");
			expect(call.where.status).toBe("PENDING");
			expect(call.where.stripePaymentIntentId).toEqual({ not: null });
			expect(call.where.deletedAt).toBeNull();
		});

		it("should only query orders older than the cutoff age", async () => {
			mockPrisma.order.findMany.mockResolvedValue([]);

			await cleanupPendingOrders();

			const call = mockPrisma.order.findMany.mock.calls[0]![0];
			const expectedCutoff = new Date(Date.now() - 30 * 60 * 1000);
			expect(call.where.createdAt.lt.getTime()).toBe(expectedCutoff.getTime());
		});

		it("should use BATCH_SIZE_MEDIUM as the take limit", async () => {
			mockPrisma.order.findMany.mockResolvedValue([]);

			await cleanupPendingOrders();

			const call = mockPrisma.order.findMany.mock.calls[0]![0];
			expect(call.take).toBe(25);
		});

		it("should select only the fields needed for processing", async () => {
			mockPrisma.order.findMany.mockResolvedValue([]);

			await cleanupPendingOrders();

			const call = mockPrisma.order.findMany.mock.calls[0]![0];
			expect(call.select).toEqual({
				id: true,
				orderNumber: true,
				stripePaymentIntentId: true,
			});
		});
	});

	describe("payment intent status filtering", () => {
		it("should skip orders whose PI status is not in the cancellable set", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "succeeded" });

			const result = await cleanupPendingOrders();

			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
			expect(result!.cancelled).toBe(0);
			expect(result!.checked).toBe(1);
		});

		it("should skip orders whose PI status is 'processing'", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "processing" });

			const result = await cleanupPendingOrders();

			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
			expect(result!.cancelled).toBe(0);
		});

		it("should cancel orders whose PI status is 'canceled'", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx());
				},
			);

			const result = await cleanupPendingOrders();

			expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
			expect(result!.cancelled).toBe(1);
		});

		it("should cancel orders whose PI status is 'requires_payment_method'", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "requires_payment_method" });
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx());
				},
			);

			const result = await cleanupPendingOrders();

			expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
			expect(result!.cancelled).toBe(1);
		});

		it("should cancel orders whose PI status is 'requires_confirmation'", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "requires_confirmation" });
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx());
				},
			);

			const result = await cleanupPendingOrders();

			expect(result!.cancelled).toBe(1);
		});

		it("should skip orders with null stripePaymentIntentId without calling Stripe", async () => {
			const order = makeOrder({ stripePaymentIntentId: null });
			mockPrisma.order.findMany.mockResolvedValue([order]);

			const result = await cleanupPendingOrders();

			expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
			expect(result!.checked).toBe(1);
			expect(result!.cancelled).toBe(0);
		});
	});

	describe("transaction: cancelOrphanedOrder", () => {
		it("should update order status to CANCELLED and payment status to EXPIRED", async () => {
			const order = makeOrder({ id: "order-cancel", stripePaymentIntentId: "pi_cancel" });
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });

			let capturedTx: ReturnType<typeof makeTx> | null = null;
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					capturedTx = makeTx();
					return fn(capturedTx);
				},
			);

			await cleanupPendingOrders();

			expect(capturedTx!.order.update).toHaveBeenCalledWith({
				where: { id: "order-cancel" },
				data: {
					status: "CANCELLED",
					paymentStatus: "EXPIRED",
				},
			});
		});

		it("should re-check order payment status inside the transaction to prevent race conditions", async () => {
			const order = makeOrder({ id: "order-race" });
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });

			let capturedTx: ReturnType<typeof makeTx> | null = null;
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					capturedTx = makeTx();
					return fn(capturedTx);
				},
			);

			await cleanupPendingOrders();

			expect(capturedTx!.order.findUnique).toHaveBeenCalledWith({
				where: { id: "order-race" },
				select: { paymentStatus: true },
			});
		});

		it("should abort the transaction without updating when order is no longer PENDING", async () => {
			const order = makeOrder({ id: "order-paid" });
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });

			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					const tx = makeTx({ orderPaymentStatus: "PAID" });
					return fn(tx);
				},
			);

			const result = await cleanupPendingOrders();

			expect(result!.cancelled).toBe(1);
		});

		it("should release discount usages when order has associated discounts", async () => {
			const order = makeOrder({ id: "order-disc" });
			const discountUsages = [
				{ id: "usage-1", discountId: "disc-A" },
				{ id: "usage-2", discountId: "disc-B" },
			];
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });

			let capturedTx: ReturnType<typeof makeTx> | null = null;
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					capturedTx = makeTx({ discountUsages });
					return fn(capturedTx);
				},
			);

			await cleanupPendingOrders();

			expect(capturedTx!.discount.update).toHaveBeenCalledTimes(2);
			expect(capturedTx!.discount.update).toHaveBeenCalledWith({
				where: { id: "disc-A" },
				data: { usageCount: { decrement: 1 } },
			});
			expect(capturedTx!.discount.update).toHaveBeenCalledWith({
				where: { id: "disc-B" },
				data: { usageCount: { decrement: 1 } },
			});
		});

		it("should delete discount usages when order has associated discounts", async () => {
			const order = makeOrder({ id: "order-del-usages" });
			const discountUsages = [{ id: "usage-1", discountId: "disc-A" }];
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });

			let capturedTx: ReturnType<typeof makeTx> | null = null;
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					capturedTx = makeTx({ discountUsages });
					return fn(capturedTx);
				},
			);

			await cleanupPendingOrders();

			expect(capturedTx!.discountUsage.deleteMany).toHaveBeenCalledWith({
				where: { orderId: "order-del-usages" },
			});
		});

		it("should not call deleteMany on discountUsage when there are no usages", async () => {
			const order = makeOrder({ id: "order-no-disc" });
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });

			let capturedTx: ReturnType<typeof makeTx> | null = null;
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					capturedTx = makeTx({ discountUsages: [] });
					return fn(capturedTx);
				},
			);

			await cleanupPendingOrders();

			expect(capturedTx!.discountUsage.deleteMany).not.toHaveBeenCalled();
		});
	});

	describe("cache invalidation", () => {
		it("should invalidate order and dashboard cache tags when orders are cancelled", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx());
				},
			);

			await cleanupPendingOrders();

			expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
			expect(mockUpdateTag).toHaveBeenCalledWith("admin-orders-list");
			expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
			expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-kpis");
			expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-recent-orders");
		});

		it("should also invalidate discount usage cache tags when discounts are released", async () => {
			const order = makeOrder({ id: "order-with-disc" });
			const discountUsages = [{ id: "usage-1", discountId: "disc-XYZ" }];
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx({ discountUsages }));
				},
			);

			await cleanupPendingOrders();

			expect(mockUpdateTag).toHaveBeenCalledWith("discount-usage-disc-XYZ");
		});

		it("should not call updateTag when no orders are cancelled", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "succeeded" });

			await cleanupPendingOrders();

			expect(mockUpdateTag).not.toHaveBeenCalled();
		});

		it("should deduplicate discount cache tags when multiple orders share a discount", async () => {
			const orders = [
				makeOrder({ id: "order-A", stripePaymentIntentId: "pi_A" }),
				makeOrder({ id: "order-B", stripePaymentIntentId: "pi_B" }),
			];
			mockPrisma.order.findMany.mockResolvedValue(orders);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });

			const sharedDiscountId = "disc-shared";
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx({ discountUsages: [{ id: "u-1", discountId: sharedDiscountId }] }));
				},
			);

			await cleanupPendingOrders();

			const discountTagCalls = mockUpdateTag.mock.calls.filter(
				([tag]: [string]) => tag === `discount-usage-${sharedDiscountId}`,
			);
			expect(discountTagCalls).toHaveLength(1);
		});
	});

	describe("error handling", () => {
		it("should count errors when the Stripe API call fails", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error("Stripe timeout"));

			const result = await cleanupPendingOrders();

			expect(result!.errors).toBe(1);
			expect(result!.cancelled).toBe(0);
		});

		it("should count errors when the transaction fails", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
			mockPrisma.$transaction.mockRejectedValue(new Error("DB connection lost"));

			const result = await cleanupPendingOrders();

			expect(result!.errors).toBe(1);
			expect(result!.cancelled).toBe(0);
		});

		it("should continue processing subsequent orders after a Stripe error", async () => {
			const orders = [
				makeOrder({ id: "order-err", stripePaymentIntentId: "pi_err" }),
				makeOrder({ id: "order-ok", stripePaymentIntentId: "pi_ok" }),
			];
			mockPrisma.order.findMany.mockResolvedValue(orders);
			mockStripe.paymentIntents.retrieve
				.mockRejectedValueOnce(new Error("Stripe error"))
				.mockResolvedValueOnce({ status: "canceled" });
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx());
				},
			);

			const result = await cleanupPendingOrders();

			expect(result!.errors).toBe(1);
			expect(result!.cancelled).toBe(1);
			expect(result!.checked).toBe(2);
		});

		it("should send admin alert when there are errors", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error("Stripe error"));

			await cleanupPendingOrders();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-pending-orders",
					errors: 1,
				}),
			);
		});

		it("should include checked and cancelled counts in the admin alert details", async () => {
			const orders = [
				makeOrder({ id: "order-cancel-ok", stripePaymentIntentId: "pi_ok" }),
				makeOrder({ id: "order-err", stripePaymentIntentId: "pi_err" }),
			];
			mockPrisma.order.findMany.mockResolvedValue(orders);
			mockStripe.paymentIntents.retrieve
				.mockResolvedValueOnce({ status: "canceled" })
				.mockRejectedValueOnce(new Error("Stripe error"));
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx());
				},
			);

			await cleanupPendingOrders();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({
						checked: 2,
						cancelled: 1,
					}),
				}),
			);
		});

		it("should not send admin alert when errors is 0", async () => {
			const order = makeOrder();
			mockPrisma.order.findMany.mockResolvedValue([order]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "succeeded" });

			await cleanupPendingOrders();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("hasMore flag", () => {
		it("should return hasMore: true when exactly BATCH_SIZE_MEDIUM (25) orders are returned", async () => {
			const orders = Array.from({ length: 25 }, (_, i) =>
				makeOrder({
					id: `order-${i}`,
					orderNumber: `SYN-${String(i).padStart(3, "0")}`,
					stripePaymentIntentId: `pi_${i}`,
				}),
			);
			mockPrisma.order.findMany.mockResolvedValue(orders);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "succeeded" });

			const result = await cleanupPendingOrders();

			expect(result!.hasMore).toBe(true);
			expect(result!.checked).toBe(25);
		});

		it("should return hasMore: false when fewer than 25 orders are returned", async () => {
			const orders = Array.from({ length: 10 }, (_, i) =>
				makeOrder({ id: `order-${i}`, stripePaymentIntentId: `pi_${i}` }),
			);
			mockPrisma.order.findMany.mockResolvedValue(orders);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "succeeded" });

			const result = await cleanupPendingOrders();

			expect(result!.hasMore).toBe(false);
		});
	});

	describe("deadline management", () => {
		it("should stop processing before the deadline is exceeded", async () => {
			const orders = Array.from({ length: 5 }, (_, i) =>
				makeOrder({ id: `order-${i}`, stripePaymentIntentId: `pi_${i}` }),
			);
			mockPrisma.order.findMany.mockResolvedValue(orders);

			// First Stripe call advances clock past the 50s deadline so subsequent
			// iterations are skipped. The service still reports the full DB batch in
			// `checked` but Stripe is only called once.
			mockStripe.paymentIntents.retrieve.mockImplementation(async () => {
				vi.setSystemTime(new Date(Date.now() + 51_000));
				return { status: "canceled" };
			});
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx());
				},
			);

			await cleanupPendingOrders();

			expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledTimes(1);
		});
	});

	describe("mixed results", () => {
		it("should handle a batch with cancellable, non-cancellable and errored orders", async () => {
			const orders = [
				makeOrder({ id: "order-cancel", stripePaymentIntentId: "pi_cancel" }),
				makeOrder({ id: "order-ok", stripePaymentIntentId: "pi_ok" }),
				makeOrder({ id: "order-err", stripePaymentIntentId: "pi_err" }),
				makeOrder({ id: "order-skip", stripePaymentIntentId: null }),
			];
			mockPrisma.order.findMany.mockResolvedValue(orders);
			mockStripe.paymentIntents.retrieve
				.mockResolvedValueOnce({ status: "canceled" })
				.mockResolvedValueOnce({ status: "succeeded" })
				.mockRejectedValueOnce(new Error("Stripe error"));
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
					return fn(makeTx());
				},
			);

			const result = await cleanupPendingOrders();

			expect(result!.checked).toBe(4);
			expect(result!.cancelled).toBe(1);
			expect(result!.errors).toBe(1);
			expect(result!.hasMore).toBe(false);
		});
	});
});
