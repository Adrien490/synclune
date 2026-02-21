import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockSyncStripeRefunds,
	mockUpdateOrderPaymentStatus,
	mockFindRefundByStripeId,
	mockMapStripeRefundStatus,
	mockUpdateRefundStatus,
	mockMarkRefundAsFailed,
	mockGetBaseUrl,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
	},
	mockSyncStripeRefunds: vi.fn(),
	mockUpdateOrderPaymentStatus: vi.fn(),
	mockFindRefundByStripeId: vi.fn(),
	mockMapStripeRefundStatus: vi.fn(),
	mockUpdateRefundStatus: vi.fn(),
	mockMarkRefundAsFailed: vi.fn(),
	mockGetBaseUrl: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("../../services/refund.service", () => ({
	syncStripeRefunds: mockSyncStripeRefunds,
	updateOrderPaymentStatus: mockUpdateOrderPaymentStatus,
	findRefundByStripeId: mockFindRefundByStripeId,
	mapStripeRefundStatus: mockMapStripeRefundStatus,
	updateRefundStatus: mockUpdateRefundStatus,
	markRefundAsFailed: mockMarkRefundAsFailed,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
		ADMIN_ORDERS_LIST: "admin-orders-list",
	},
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: {
		ACCOUNT: {
			ORDER_DETAIL: (orderNumber: string) => `/commandes/${orderNumber}`,
		},
	},
}));

// Mock stripe to avoid API key requirement from transitive imports
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {},
}));

import type Stripe from "stripe";
import {
	handleChargeRefunded,
	handleRefundUpdated,
	handleRefundFailed,
} from "../refund-handlers";

// ============================================================================
// Fixtures
// ============================================================================

function makeCharge(overrides: Record<string, unknown> = {}) {
	return {
		id: "ch_123",
		payment_intent: "pi_456",
		amount_refunded: 5000,
		refunds: { data: [{ id: "re_1", reason: "requested_by_customer" }] },
		...overrides,
	} as unknown as Stripe.Charge;
}

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		total: 10000,
		paymentStatus: "PAID",
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		userId: "user-1",
		refunds: [],
		...overrides,
	};
}

function makeStripeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "re_stripe_123",
		status: "succeeded",
		failure_reason: null,
		metadata: { refund_id: "refund-db-1" },
		...overrides,
	} as unknown as Stripe.Refund;
}

function makeRefundRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-db-1",
		status: "APPROVED",
		amount: 5000,
		orderId: "order-1",
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			stripePaymentIntentId: "pi_456",
		},
		...overrides,
	};
}

// ============================================================================
// handleChargeRefunded
// ============================================================================

describe("handleChargeRefunded", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
	});

	it("should throw when no payment_intent on charge", async () => {
		const charge = makeCharge({ payment_intent: null });

		await expect(handleChargeRefunded(charge)).rejects.toThrow(
			"No payment intent found for refunded charge",
		);
	});

	it("should skip (success) when order not found", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await handleChargeRefunded(makeCharge());

		expect(result).toEqual({ success: true, skipped: true, reason: "Order not found" });
	});

	it("should handle payment_intent as string", async () => {
		const order = makeOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		await handleChargeRefunded(makeCharge({ payment_intent: "pi_456" }));

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stripePaymentIntentId: "pi_456" },
			}),
		);
	});

	it("should handle payment_intent as object", async () => {
		const order = makeOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		await handleChargeRefunded(makeCharge({ payment_intent: { id: "pi_789" } }));

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stripePaymentIntentId: "pi_789" },
			}),
		);
	});

	it("should call syncStripeRefunds with correct args", async () => {
		const charge = makeCharge();
		const order = makeOrder({ refunds: [{ id: "r1" }] });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		await handleChargeRefunded(charge);

		expect(mockSyncStripeRefunds).toHaveBeenCalledWith(
			charge,
			order.refunds,
			order.id,
		);
	});

	it("should call updateOrderPaymentStatus with correct amount", async () => {
		const order = makeOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });

		await handleChargeRefunded(makeCharge({ amount_refunded: 10000 }));

		expect(mockUpdateOrderPaymentStatus).toHaveBeenCalledWith(
			"order-1",
			10000,
			10000,
			"PAID",
		);
	});

	it("should include userId cache tag when userId exists", async () => {
		const order = makeOrder({ userId: "user-1" });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		const result = await handleChargeRefunded(makeCharge());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask?.type).toBe("INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("orders-user-user-1");
		}
	});

	it("should not include userId cache tag when userId is null", async () => {
		const order = makeOrder({ userId: null });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		const result = await handleChargeRefunded(makeCharge());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).not.toContain(expect.stringContaining("orders-user-"));
		}
	});

	it("should build email task with correct data", async () => {
		const order = makeOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		const result = await handleChargeRefunded(makeCharge());

		const emailTask = result.tasks?.find((t) => t.type === "REFUND_CONFIRMATION_EMAIL");
		expect(emailTask).toBeDefined();
		if (emailTask?.type === "REFUND_CONFIRMATION_EMAIL") {
			expect(emailTask.data.to).toBe("client@example.com");
			expect(emailTask.data.orderNumber).toBe("SYN-001");
			expect(emailTask.data.isPartialRefund).toBe(true);
		}
	});

	it("should not build email task when customerEmail is absent", async () => {
		const order = makeOrder({ customerEmail: null });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		const result = await handleChargeRefunded(makeCharge());

		const emailTask = result.tasks?.find((t) => t.type === "REFUND_CONFIRMATION_EMAIL");
		expect(emailTask).toBeUndefined();
	});

	it("should determine isPartialRefund correctly (full refund)", async () => {
		const order = makeOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });

		const result = await handleChargeRefunded(makeCharge({ amount_refunded: 10000 }));

		const emailTask = result.tasks?.find((t) => t.type === "REFUND_CONFIRMATION_EMAIL");
		if (emailTask?.type === "REFUND_CONFIRMATION_EMAIL") {
			expect(emailTask.data.isPartialRefund).toBe(false);
		}
	});
});

// ============================================================================
// handleRefundUpdated
// ============================================================================

describe("handleRefundUpdated", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should skip when refund not found in DB", async () => {
		mockFindRefundByStripeId.mockResolvedValue(null);

		const result = await handleRefundUpdated(makeStripeRefund());

		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Refund not found in database",
		});
	});

	it("should not update when status has not changed", async () => {
		const refund = makeRefundRecord({ status: "COMPLETED" });
		mockFindRefundByStripeId.mockResolvedValue(refund);
		mockMapStripeRefundStatus.mockReturnValue("COMPLETED");

		const result = await handleRefundUpdated(makeStripeRefund({ status: "succeeded" }));

		expect(mockUpdateRefundStatus).not.toHaveBeenCalled();
		expect(result).toEqual({ success: true });
	});

	it("should call updateRefundStatus when status changes", async () => {
		const refund = makeRefundRecord({ status: "APPROVED" });
		mockFindRefundByStripeId.mockResolvedValue(refund);
		mockMapStripeRefundStatus.mockReturnValue("COMPLETED");

		const result = await handleRefundUpdated(makeStripeRefund({ status: "succeeded" }));

		expect(mockUpdateRefundStatus).toHaveBeenCalledWith(
			"refund-db-1",
			"COMPLETED",
			"succeeded",
			"APPROVED",
		);
		expect(result.success).toBe(true);
		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("order-refunds-order-1");
		}
	});

	it("should use metadata.refund_id for lookup", async () => {
		mockFindRefundByStripeId.mockResolvedValue(null);

		await handleRefundUpdated(makeStripeRefund({ metadata: { refund_id: "db-refund-99" } }));

		expect(mockFindRefundByStripeId).toHaveBeenCalledWith("re_stripe_123", "db-refund-99");
	});
});

// ============================================================================
// handleRefundFailed
// ============================================================================

describe("handleRefundFailed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
	});

	it("should skip when refund not found in DB", async () => {
		mockFindRefundByStripeId.mockResolvedValue(null);

		const result = await handleRefundFailed(makeStripeRefund());

		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Refund not found in database",
		});
	});

	it("should call markRefundAsFailed with failure_reason", async () => {
		const refund = makeRefundRecord();
		mockFindRefundByStripeId.mockResolvedValue(refund);
		mockMarkRefundAsFailed.mockResolvedValue(undefined);

		await handleRefundFailed(makeStripeRefund({ failure_reason: "expired_or_canceled_card" }));

		expect(mockMarkRefundAsFailed).toHaveBeenCalledWith(
			"refund-db-1",
			"expired_or_canceled_card",
		);
	});

	it("should use 'unknown' when no failure_reason", async () => {
		const refund = makeRefundRecord();
		mockFindRefundByStripeId.mockResolvedValue(refund);
		mockMarkRefundAsFailed.mockResolvedValue(undefined);

		await handleRefundFailed(makeStripeRefund({ failure_reason: null }));

		expect(mockMarkRefundAsFailed).toHaveBeenCalledWith("refund-db-1", "unknown");
	});

	it("should build admin alert task with correct data", async () => {
		const refund = makeRefundRecord();
		mockFindRefundByStripeId.mockResolvedValue(refund);
		mockMarkRefundAsFailed.mockResolvedValue(undefined);

		const result = await handleRefundFailed(
			makeStripeRefund({ failure_reason: "lost_or_stolen_card" }),
		);

		const alertTask = result.tasks?.find((t) => t.type === "ADMIN_REFUND_FAILED_ALERT");
		expect(alertTask).toBeDefined();
		if (alertTask?.type === "ADMIN_REFUND_FAILED_ALERT") {
			expect(alertTask.data.orderNumber).toBe("SYN-001");
			expect(alertTask.data.amount).toBe(5000);
			expect(alertTask.data.errorMessage).toContain("lost_or_stolen_card");
			expect(alertTask.data.dashboardUrl).toBe("https://synclune.fr/admin/ventes/remboursements");
		}
	});

	it("should return cache invalidation tags", async () => {
		const refund = makeRefundRecord();
		mockFindRefundByStripeId.mockResolvedValue(refund);
		mockMarkRefundAsFailed.mockResolvedValue(undefined);

		const result = await handleRefundFailed(makeStripeRefund());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask).toBeDefined();
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("order-refunds-order-1");
		}
	});
});
