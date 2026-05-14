import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockUpdateTag, mockCreateOrderAuditTx } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
		productSku: { update: vi.fn() },
		discountUsage: { findMany: vi.fn(), deleteMany: vi.fn() },
		discount: { update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockUpdateTag: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

import { cleanupPendingOrders } from "../cleanup-pending-orders.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

interface StaleOrderFixture {
	id: string;
	orderNumber: string;
	createdAt: Date;
	items: Array<{ id: string; skuId: string; quantity: number }>;
}

function buildStaleOrder(overrides: Partial<StaleOrderFixture> = {}): StaleOrderFixture {
	return {
		id: overrides.id ?? "order-1",
		orderNumber: overrides.orderNumber ?? "SYN-001",
		createdAt: overrides.createdAt ?? new Date("2026-02-07T12:00:00Z"),
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
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);
		return cb(mockPrisma);
	});
}

describe("cleanupPendingOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
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

	it("cancels a stale order, restores stock, and writes an audit entry", async () => {
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
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-1" },
			data: { inventory: { increment: 2 } },
		});
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
					releasedDiscountsCount: 0,
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

	it("releases discount usages atomically when present", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildStaleOrder()]);
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => {
			mockPrisma.order.findUnique.mockResolvedValue({
				status: "PENDING",
				paymentStatus: "PENDING",
				stripePaymentIntentId: null,
			});
			mockPrisma.discountUsage.findMany.mockResolvedValue([
				{ id: "usage-1", discountId: "discount-1" },
			]);
			return cb(mockPrisma);
		});

		await cleanupPendingOrders();

		expect(mockPrisma.discount.update).toHaveBeenCalledWith({
			where: { id: "discount-1" },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
			where: { orderId: "order-1" },
		});
	});

	it("invalidates LIST, ADMIN_ORDERS_LIST, ADMIN_BADGES, and SKU stock tags when at least one order is cancelled", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildStaleOrder()]);
		mockTransactionResolves();

		await cleanupPendingOrders();

		const tags = mockUpdateTag.mock.calls.map((c) => c[0]);
		expect(tags).toEqual(
			expect.arrayContaining([
				"orders-list",
				"admin-orders-list",
				"admin-badges",
				"sku-stock-sku-1",
			]),
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
				mockPrisma.discountUsage.findMany.mockResolvedValue([]);
				return cb(mockPrisma);
			});

		const result = await cleanupPendingOrders();

		expect(result.errored).toBe(1);
		expect(result.processed).toBe(1);
	});
});
