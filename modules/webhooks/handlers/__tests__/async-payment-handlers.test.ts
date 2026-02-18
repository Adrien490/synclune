import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks - must be declared before any imports
// ============================================================================

const {
	mockPrisma,
	mockTx,
	mockHandleCheckoutSessionCompleted,
	mockGetBaseUrl,
} = vi.hoisted(() => {
	// Transaction client mirrors the prisma mock methods needed by handleAsyncPaymentFailed
	const mockTx = {
		discountUsage: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		discount: {
			update: vi.fn(),
		},
		order: {
			update: vi.fn(),
		},
	};

	const mockPrisma = {
		order: {
			findUnique: vi.fn(),
		},
		$transaction: vi.fn(),
		_mockTx: mockTx,
	};

	return {
		mockPrisma,
		mockTx,
		mockHandleCheckoutSessionCompleted: vi.fn(),
		mockGetBaseUrl: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/webhooks/handlers/checkout-handlers", () => ({
	handleCheckoutSessionCompleted: mockHandleCheckoutSessionCompleted,
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		FAILED: "FAILED",
		PAID: "PAID",
		REFUNDED: "REFUNDED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		PENDING: "PENDING",
	},
}));

// Mock stripe to avoid API key requirement from transitive imports
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		checkout: {
			sessions: {
				retrieve: vi.fn(),
			},
		},
	},
}));

import {
	handleAsyncPaymentSucceeded,
	handleAsyncPaymentFailed,
} from "../async-payment-handlers";

// ============================================================================
// Fixtures
// ============================================================================

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		id: "cs_test_async_123",
		object: "checkout.session",
		metadata: { orderId: "order-1" },
		client_reference_id: null,
		...overrides,
	} as unknown as import("stripe").default.Checkout.Session;
}

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		paymentStatus: "PENDING",
		...overrides,
	};
}

// ============================================================================
// handleAsyncPaymentSucceeded
// ============================================================================

describe("handleAsyncPaymentSucceeded", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should delegate to handleCheckoutSessionCompleted with the session", async () => {
		const session = makeSession();
		const expectedResult = { success: true, tasks: [] };
		mockHandleCheckoutSessionCompleted.mockResolvedValue(expectedResult);

		const result = await handleAsyncPaymentSucceeded(session);

		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledOnce();
		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledWith(session);
		expect(result).toBe(expectedResult);
	});

	it("should throw an error when no orderId in metadata and no client_reference_id", async () => {
		const session = makeSession({
			metadata: {},
			client_reference_id: null,
		});

		await expect(handleAsyncPaymentSucceeded(session)).rejects.toThrow(
			"No order ID found in async payment session metadata"
		);
		expect(mockHandleCheckoutSessionCompleted).not.toHaveBeenCalled();
	});

	it("should use client_reference_id as fallback when metadata.orderId is missing", async () => {
		const session = makeSession({
			metadata: {},
			client_reference_id: "order-from-ref",
		});
		const expectedResult = { success: true, tasks: [] };
		mockHandleCheckoutSessionCompleted.mockResolvedValue(expectedResult);

		const result = await handleAsyncPaymentSucceeded(session);

		// Delegates successfully - the fallback orderId was resolved
		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledOnce();
		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledWith(session);
		expect(result).toBe(expectedResult);
	});

	it("should propagate errors thrown by handleCheckoutSessionCompleted", async () => {
		const session = makeSession();
		const downstreamError = new Error("Checkout processing failed");
		mockHandleCheckoutSessionCompleted.mockRejectedValue(downstreamError);

		await expect(handleAsyncPaymentSucceeded(session)).rejects.toThrow(
			"Checkout processing failed"
		);
	});
});

// ============================================================================
// handleAsyncPaymentFailed
// ============================================================================

describe("handleAsyncPaymentFailed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		// Default: transaction executes its callback with mockTx
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
		);
	});

	it("should cancel order, release discounts, and return INVALIDATE_CACHE + PAYMENT_FAILED_EMAIL tasks", async () => {
		const session = makeSession();
		const discountUsages = [
			{ id: "du-1", discountId: "disc-1" },
			{ id: "du-2", discountId: "disc-2" },
		];
		const updatedOrder = makeOrder();

		mockPrisma.order.findUnique.mockResolvedValue({ paymentStatus: "PENDING" });
		mockTx.discountUsage.findMany.mockResolvedValue(discountUsages);
		mockTx.discount.update.mockResolvedValue({});
		mockTx.discountUsage.deleteMany.mockResolvedValue({});
		mockTx.order.update.mockResolvedValue(updatedOrder);

		const result = await handleAsyncPaymentFailed(session);

		// Discount counters decremented for each usage
		expect(mockTx.discount.update).toHaveBeenCalledTimes(2);
		expect(mockTx.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-1" },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockTx.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-2" },
			data: { usageCount: { decrement: 1 } },
		});

		// Discount usage records removed
		expect(mockTx.discountUsage.deleteMany).toHaveBeenCalledWith({
			where: { orderId: "order-1" },
		});

		// Order updated to CANCELLED / FAILED
		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "FAILED", status: "CANCELLED" },
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				customerName: true,
			},
		});

		expect(result.success).toBe(true);
		expect(result.skipped).toBeUndefined();

		// INVALIDATE_CACHE task present with expected tags
		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask).toBeDefined();
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("orders-list");
			expect(cacheTask.tags).toContain("admin-badges");
		}

		// PAYMENT_FAILED_EMAIL task present with correct data
		const emailTask = result.tasks?.find((t) => t.type === "PAYMENT_FAILED_EMAIL");
		expect(emailTask).toBeDefined();
		if (emailTask?.type === "PAYMENT_FAILED_EMAIL") {
			expect(emailTask.data.to).toBe("client@example.com");
			expect(emailTask.data.customerName).toBe("Marie Dupont");
			expect(emailTask.data.orderNumber).toBe("SYN-001");
			expect(emailTask.data.retryUrl).toBe("https://synclune.fr/creations");
		}
	});

	it("should throw an error when no orderId in metadata and no client_reference_id", async () => {
		const session = makeSession({
			metadata: {},
			client_reference_id: null,
		});

		await expect(handleAsyncPaymentFailed(session)).rejects.toThrow(
			"No order ID found in failed async payment session metadata"
		);
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
	});

	it("should throw an error when order is not found in the database", async () => {
		const session = makeSession();
		mockPrisma.order.findUnique.mockResolvedValue(null);

		await expect(handleAsyncPaymentFailed(session)).rejects.toThrow(
			"Order not found: order-1"
		);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should skip and return idempotent result when order is already PAID", async () => {
		const session = makeSession();
		mockPrisma.order.findUnique.mockResolvedValue({ paymentStatus: "PAID" });

		const result = await handleAsyncPaymentFailed(session);

		expect(result.success).toBe(true);
		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("Order already PAID");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should skip and return idempotent result when order is already REFUNDED", async () => {
		const session = makeSession();
		mockPrisma.order.findUnique.mockResolvedValue({ paymentStatus: "REFUNDED" });

		const result = await handleAsyncPaymentFailed(session);

		expect(result.success).toBe(true);
		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("Order already REFUNDED");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should skip and return idempotent result when order is already PARTIALLY_REFUNDED", async () => {
		const session = makeSession();
		mockPrisma.order.findUnique.mockResolvedValue({ paymentStatus: "PARTIALLY_REFUNDED" });

		const result = await handleAsyncPaymentFailed(session);

		expect(result.success).toBe(true);
		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("Order already PARTIALLY_REFUNDED");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should cancel order without calling discount operations when no discount usages exist", async () => {
		const session = makeSession();
		const updatedOrder = makeOrder();

		mockPrisma.order.findUnique.mockResolvedValue({ paymentStatus: "PENDING" });
		mockTx.discountUsage.findMany.mockResolvedValue([]);
		mockTx.order.update.mockResolvedValue(updatedOrder);

		const result = await handleAsyncPaymentFailed(session);

		// No discount operations performed
		expect(mockTx.discount.update).not.toHaveBeenCalled();
		expect(mockTx.discountUsage.deleteMany).not.toHaveBeenCalled();

		// Order still cancelled
		expect(mockTx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: { paymentStatus: "FAILED", status: "CANCELLED" },
			})
		);

		expect(result.success).toBe(true);
		expect(result.tasks).toBeDefined();
	});

	it("should execute discount release and order cancellation atomically in one transaction", async () => {
		const session = makeSession();
		const discountUsages = [{ id: "du-1", discountId: "disc-1" }];
		const updatedOrder = makeOrder();

		mockPrisma.order.findUnique.mockResolvedValue({ paymentStatus: "PENDING" });
		mockTx.discountUsage.findMany.mockResolvedValue(discountUsages);
		mockTx.discount.update.mockResolvedValue({});
		mockTx.discountUsage.deleteMany.mockResolvedValue({});
		mockTx.order.update.mockResolvedValue(updatedOrder);

		await handleAsyncPaymentFailed(session);

		// Confirm all DB mutations happened through the transaction callback
		expect(mockPrisma.$transaction).toHaveBeenCalledOnce();

		// All mutating calls went to mockTx (the transaction proxy), not mockPrisma directly
		expect(mockTx.discountUsage.findMany).toHaveBeenCalled();
		expect(mockTx.discount.update).toHaveBeenCalled();
		expect(mockTx.discountUsage.deleteMany).toHaveBeenCalled();
		expect(mockTx.order.update).toHaveBeenCalled();
	});
});
