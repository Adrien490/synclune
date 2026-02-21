import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockExtractShippingInfo,
	mockProcessOrderTransaction,
	mockBuildPostCheckoutTasks,
	mockCancelExpiredOrder,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
		orderNote: { create: vi.fn() },
	},
	mockExtractShippingInfo: vi.fn(),
	mockProcessOrderTransaction: vi.fn(),
	mockBuildPostCheckoutTasks: vi.fn(),
	mockCancelExpiredOrder: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("../../services/checkout.service", () => ({
	extractShippingInfo: mockExtractShippingInfo,
	processOrderTransaction: mockProcessOrderTransaction,
	buildPostCheckoutTasks: mockBuildPostCheckoutTasks,
	cancelExpiredOrder: mockCancelExpiredOrder,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		NOTES: (orderId: string) => `order-notes-${orderId}`,
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

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: {
		LIST: "discounts-list",
	},
}));

// Mock stripe to avoid API key requirement
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {},
}));

import type Stripe from "stripe";
import {
	handleCheckoutSessionCompleted,
	handleCheckoutSessionExpired,
} from "../checkout-handlers";

// ============================================================================
// Fixtures
// ============================================================================

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		id: "cs_test_123",
		object: "checkout.session",
		payment_status: "paid",
		metadata: { orderId: "order-1" },
		client_reference_id: null,
		customer_email: null,
		customer_details: null,
		...overrides,
	} as unknown as Stripe.Checkout.Session;
}

// ============================================================================
// handleCheckoutSessionCompleted
// ============================================================================

describe("handleCheckoutSessionCompleted", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockExtractShippingInfo.mockResolvedValue({
			shippingCost: 500,
			shippingMethod: "standard",
			shippingRateId: "shr_123",
		});
		mockProcessOrderTransaction.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
		});
		mockBuildPostCheckoutTasks.mockReturnValue([]);
	});

	it("should return null when payment_status is unpaid", async () => {
		const session = makeSession({ payment_status: "unpaid" });

		const result = await handleCheckoutSessionCompleted(session);

		expect(result).toBeNull();
		expect(mockExtractShippingInfo).not.toHaveBeenCalled();
	});

	it("should throw when no orderId in metadata nor client_reference_id", async () => {
		const session = makeSession({
			metadata: {},
			client_reference_id: null,
		});

		await expect(handleCheckoutSessionCompleted(session)).rejects.toThrow(
			"No order ID found in checkout session metadata",
		);
	});

	it("should use metadata.orderId in priority over client_reference_id", async () => {
		const session = makeSession({
			metadata: { orderId: "order-from-meta" },
			client_reference_id: "order-from-ref",
		});
		mockPrisma.order.findUnique.mockResolvedValue(null);

		await handleCheckoutSessionCompleted(session);

		expect(mockProcessOrderTransaction).toHaveBeenCalledWith(
			"order-from-meta",
			expect.anything(),
			expect.anything(),
			expect.anything(),
		);
	});

	it("should use client_reference_id as fallback", async () => {
		const session = makeSession({
			metadata: {},
			client_reference_id: "order-from-ref",
		});
		mockPrisma.order.findUnique.mockResolvedValue(null);

		await handleCheckoutSessionCompleted(session);

		expect(mockProcessOrderTransaction).toHaveBeenCalledWith(
			"order-from-ref",
			expect.anything(),
			expect.anything(),
			expect.anything(),
		);
	});

	it("should call extractShippingInfo, processOrderTransaction, buildPostCheckoutTasks", async () => {
		const session = makeSession();
		const order = { id: "order-1", orderNumber: "SYN-001" };
		mockProcessOrderTransaction.mockResolvedValue(order);
		mockBuildPostCheckoutTasks.mockReturnValue([{ type: "ORDER_CONFIRMATION_EMAIL", data: {} }]);
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await handleCheckoutSessionCompleted(session);

		expect(mockExtractShippingInfo).toHaveBeenCalledWith(session);
		expect(mockProcessOrderTransaction).toHaveBeenCalledWith("order-1", session, 500, "shr_123");
		expect(mockBuildPostCheckoutTasks).toHaveBeenCalledWith(order, session);
		expect(result?.success).toBe(true);
	});

	it("should create orderNote when email mismatch (anti-fraud)", async () => {
		const session = makeSession({
			customer_email: "stripe@example.com",
		});
		mockPrisma.order.findUnique.mockResolvedValue({
			customerEmail: "order@example.com",
		});

		await handleCheckoutSessionCompleted(session);

		expect(mockPrisma.orderNote.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				orderId: "order-1",
				content: expect.stringContaining("ALERTE EMAIL"),
				authorId: "system",
			}),
		});
	});

	it("should not create orderNote when emails match (case-insensitive)", async () => {
		const session = makeSession({
			customer_email: "Client@Example.com",
		});
		mockPrisma.order.findUnique.mockResolvedValue({
			customerEmail: "client@example.com",
		});

		await handleCheckoutSessionCompleted(session);

		expect(mockPrisma.orderNote.create).not.toHaveBeenCalled();
	});

	it("should not create orderNote when no Stripe email", async () => {
		const session = makeSession({
			customer_email: null,
			customer_details: null,
		});

		await handleCheckoutSessionCompleted(session);

		expect(mockPrisma.orderNote.create).not.toHaveBeenCalled();
	});

	it("should use customer_details.email as fallback for anti-fraud check", async () => {
		const session = makeSession({
			customer_email: null,
			customer_details: { email: "details@example.com" },
		});
		mockPrisma.order.findUnique.mockResolvedValue({
			customerEmail: "order@example.com",
		});

		await handleCheckoutSessionCompleted(session);

		expect(mockPrisma.orderNote.create).toHaveBeenCalled();
	});

	it("should add INVALIDATE_CACHE for order notes on email mismatch", async () => {
		const session = makeSession({
			customer_email: "stripe@example.com",
		});
		mockPrisma.order.findUnique.mockResolvedValue({
			customerEmail: "order@example.com",
		});
		mockBuildPostCheckoutTasks.mockReturnValue([]);

		const result = await handleCheckoutSessionCompleted(session);

		const cacheTask = result?.tasks?.find(
			(t) => t.type === "INVALIDATE_CACHE" && "tags" in t && t.tags.includes("order-notes-order-1"),
		);
		expect(cacheTask).toBeDefined();
	});
});

// ============================================================================
// handleCheckoutSessionExpired
// ============================================================================

describe("handleCheckoutSessionExpired", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should throw when no orderId", async () => {
		const session = makeSession({
			metadata: {},
			client_reference_id: null,
		});

		await expect(handleCheckoutSessionExpired(session)).rejects.toThrow(
			"No order ID found in expired checkout session metadata",
		);
	});

	it("should call cancelExpiredOrder", async () => {
		const session = makeSession();
		mockCancelExpiredOrder.mockResolvedValue(undefined);

		await handleCheckoutSessionExpired(session);

		expect(mockCancelExpiredOrder).toHaveBeenCalledWith("order-1");
	});

	it("should return correct cache invalidation tags", async () => {
		const session = makeSession();
		mockCancelExpiredOrder.mockResolvedValue(undefined);

		const result = await handleCheckoutSessionExpired(session);

		expect(result.success).toBe(true);
		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask).toBeDefined();
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("orders-list");
			expect(cacheTask.tags).toContain("admin-badges");
			expect(cacheTask.tags).toContain("dashboard-kpis");
			expect(cacheTask.tags).toContain("discounts-list");
		}
	});
});
