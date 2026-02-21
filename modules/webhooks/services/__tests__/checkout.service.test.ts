import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks - must be declared before any imports
// ============================================================================

const {
	mockPrisma,
	mockStripe,
	mockGetShippingRateName,
	mockGetShippingMethodFromRate,
	mockGetShippingCarrierFromRate,
	mockGetCartInvalidationTags,
	mockGetOrderInvalidationTags,
	mockProductsCacheTags,
	mockGetBaseUrl,
} = vi.hoisted(() => {
	// Transaction client mirrors the prisma mock methods
	const mockTx = {
		order: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		productSku: {
			findMany: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		cartItem: {
			deleteMany: vi.fn(),
		},
		discountUsage: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		discount: {
			update: vi.fn(),
		},
	};

	const mockPrisma = {
		order: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		$transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
		_mockTx: mockTx,
	};

	const mockStripe = {
		checkout: {
			sessions: {
				retrieve: vi.fn(),
			},
		},
	};

	return {
		mockPrisma,
		mockStripe,
		mockGetShippingRateName: vi.fn(),
		mockGetShippingMethodFromRate: vi.fn(),
		mockGetShippingCarrierFromRate: vi.fn(),
		mockGetCartInvalidationTags: vi.fn(),
		mockGetOrderInvalidationTags: vi.fn(),
		mockProductsCacheTags: {
			SKU_STOCK: vi.fn((skuId: string) => `sku-stock-${skuId}`),
		},
		mockGetBaseUrl: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
}));

vi.mock("@/modules/orders/constants/stripe-shipping-rates", () => ({
	getShippingRateName: mockGetShippingRateName,
	getShippingMethodFromRate: mockGetShippingMethodFromRate,
	getShippingCarrierFromRate: mockGetShippingCarrierFromRate,
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: mockProductsCacheTags,
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
}));

import {
	extractShippingInfo,
	processOrderTransaction,
	buildPostCheckoutTasks,
	cancelExpiredOrder,
} from "../checkout.service";
import type { OrderWithItems } from "../../types/checkout.types";

// ============================================================================
// Fixtures
// ============================================================================

function makeStripeSession(overrides: Record<string, unknown> = {}): import("stripe").default.Checkout.Session {
	return {
		id: "cs_test_abc123",
		object: "checkout.session",
		customer: "cus_test_123",
		customer_email: "client@example.com",
		customer_details: { email: "client@example.com" },
		payment_intent: "pi_test_abc123",
		metadata: {},
		total_details: { amount_shipping: 600 },
		shipping_cost: null,
		...overrides,
	} as unknown as import("stripe").default.Checkout.Session;
}

function makeOrderRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		userId: "user-1",
		customerEmail: "client@example.com",
		paymentStatus: "PENDING",
		shippingFirstName: "Jean",
		shippingLastName: "Dupont",
		shippingAddress1: "1 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33600000000",
		subtotal: 5000,
		discountAmount: 0,
		shippingCost: 600,
		taxAmount: 0,
		total: 5600,
		user: { id: "user-1" },
		items: [
			{
				skuId: "sku-1",
				quantity: 2,
				price: 2500,
				productTitle: "Bague Or",
				skuColor: "Or",
				skuMaterial: "Or 18k",
				skuSize: "52",
				sku: { id: "sku-1", inventory: 10, sku: "BAG-OR-52" },
			},
		],
		...overrides,
	};
}

function makeOrderWithItems(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		userId: "user-1",
		shippingFirstName: "Jean",
		shippingLastName: "Dupont",
		shippingAddress1: "1 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33600000000",
		subtotal: 5000,
		discountAmount: 0,
		shippingCost: 600,
		taxAmount: 0,
		total: 5600,
		items: [
			{
				skuId: "sku-1",
				quantity: 2,
				price: 2500,
				productTitle: "Bague Or",
				skuColor: "Or",
				skuMaterial: "Or 18k",
				skuSize: "52",
				sku: { id: "sku-1", inventory: 10, sku: "BAG-OR-52" },
			},
		],
		...overrides,
	};
}

// ============================================================================
// extractShippingInfo
// ============================================================================

describe("extractShippingInfo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetShippingRateName.mockReturnValue("Livraison France");
	});

	it("should retrieve full session and extract shipping info with expanded shipping rate object", async () => {
		const session = makeStripeSession();
		const fullSession = {
			id: "cs_test_abc123",
			total_details: { amount_shipping: 600 },
			shipping_cost: {
				shipping_rate: {
					id: "shr_france_123",
				},
			},
		};
		mockStripe.checkout.sessions.retrieve.mockResolvedValue(fullSession);

		const result = await extractShippingInfo(session);

		expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_abc123", {
			expand: ["shipping_cost.shipping_rate"],
		});
		expect(result.shippingCost).toBe(600);
		expect(result.shippingRateId).toBe("shr_france_123");
		expect(mockGetShippingRateName).toHaveBeenCalledWith("shr_france_123");
		expect(result.shippingMethod).toBe("Livraison France");
	});

	it("should handle string shipping rate id instead of object", async () => {
		const session = makeStripeSession();
		const fullSession = {
			id: "cs_test_abc123",
			total_details: { amount_shipping: 1500 },
			shipping_cost: {
				shipping_rate: "shr_europe_456",
			},
		};
		mockStripe.checkout.sessions.retrieve.mockResolvedValue(fullSession);
		mockGetShippingRateName.mockReturnValue("Livraison Europe");

		const result = await extractShippingInfo(session);

		expect(result.shippingRateId).toBe("shr_europe_456");
		expect(result.shippingCost).toBe(1500);
		expect(result.shippingMethod).toBe("Livraison Europe");
	});

	it("should use default shipping method when no shipping rate id is available", async () => {
		const session = makeStripeSession();
		const fullSession = {
			id: "cs_test_abc123",
			total_details: { amount_shipping: 0 },
			shipping_cost: null,
		};
		mockStripe.checkout.sessions.retrieve.mockResolvedValue(fullSession);

		const result = await extractShippingInfo(session);

		expect(result.shippingRateId).toBeUndefined();
		expect(result.shippingMethod).toBe("Livraison standard");
		expect(mockGetShippingRateName).not.toHaveBeenCalled();
	});

	it("should fall back to session-level data when Stripe API throws", async () => {
		const session = makeStripeSession({
			total_details: { amount_shipping: 600 },
		});
		mockStripe.checkout.sessions.retrieve.mockRejectedValue(new Error("Stripe API error"));

		const result = await extractShippingInfo(session);

		expect(result.shippingCost).toBe(600);
		expect(result.shippingMethod).toBe("Livraison standard");
		expect(result.shippingRateId).toBeUndefined();
	});

	it("should fall back with 0 shipping cost when session has no total_details", async () => {
		const session = makeStripeSession({ total_details: null });
		mockStripe.checkout.sessions.retrieve.mockRejectedValue(new Error("Network timeout"));

		const result = await extractShippingInfo(session);

		expect(result.shippingCost).toBe(0);
		expect(result.shippingMethod).toBe("Livraison standard");
		expect(result.shippingRateId).toBeUndefined();
	});
});

// ============================================================================
// processOrderTransaction
// ============================================================================

describe("processOrderTransaction", () => {
	const mockTx = mockPrisma._mockTx;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetShippingMethodFromRate.mockReturnValue("STANDARD");
		mockGetShippingCarrierFromRate.mockReturnValue("autre");
		// Default: transaction executes its callback
		mockPrisma.$transaction.mockImplementation(
			(fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
		);
	});

	it("should validate stock, decrement inventory, update order, and clear cart for authenticated user", async () => {
		const order = makeOrderRow();
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.order.update.mockResolvedValue({});
		mockTx.productSku.update.mockResolvedValue({});
		mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
		mockTx.cartItem.deleteMany.mockResolvedValue({});

		// Stock validation now happens inside the transaction via tx.productSku.findMany
		mockTx.productSku.findMany.mockResolvedValue([
			{ id: "sku-1", inventory: 10, isActive: true, deletedAt: null, product: { status: "PUBLIC", deletedAt: null } },
		]);

		const session = makeStripeSession();
		const result = await processOrderTransaction("order-1", session, 600, "shr_france_123");

		// Stock validation query inside transaction
		expect(mockTx.productSku.findMany).toHaveBeenCalledWith({
			where: { id: { in: ["sku-1"] } },
			select: expect.objectContaining({
				id: true,
				inventory: true,
				isActive: true,
				deletedAt: true,
			}),
		});

		// Stock decremented for each item
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-1" },
			data: { inventory: { decrement: 2 } },
		});

		// Order updated with PAID status and shipping info
		expect(mockTx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: expect.objectContaining({
					status: "PROCESSING",
					paymentStatus: "PAID",
					shippingCost: 600,
				}),
			})
		);

		// Cart cleared for authenticated user
		expect(mockTx.cartItem.deleteMany).toHaveBeenCalledWith({
			where: { cart: { userId: "user-1" } },
		});

		// Returns mapped order
		expect(result.id).toBe("order-1");
		expect(result.orderNumber).toBe("SYN-001");
		expect(result.items).toHaveLength(1);
	});

	it("should clear guest cart using guestSessionId from metadata when user is not authenticated", async () => {
		const order = makeOrderRow({ userId: null, user: null });
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.order.update.mockResolvedValue({});
		mockTx.productSku.update.mockResolvedValue({});
		mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
		mockTx.cartItem.deleteMany.mockResolvedValue({});

		mockTx.productSku.findMany.mockResolvedValue([
			{ id: "sku-1", inventory: 10, isActive: true, deletedAt: null, product: { status: "PUBLIC", deletedAt: null } },
		]);

		const session = makeStripeSession({ metadata: { guestSessionId: "guest-session-xyz" } });
		await processOrderTransaction("order-1", session, 600, "shr_france_123");

		expect(mockTx.cartItem.deleteMany).toHaveBeenCalledWith({
			where: { cart: { sessionId: "guest-session-xyz" } },
		});
		// Should NOT call deleteMany with userId
		const deleteCalls = mockTx.cartItem.deleteMany.mock.calls;
		expect(deleteCalls.every((call: unknown[]) => {
			const arg = call[0] as { where: { cart: Record<string, unknown> } };
			return !("userId" in arg.where.cart);
		})).toBe(true);
	});

	it("should skip processing and return order immediately when already PAID (idempotent)", async () => {
		const order = makeOrderRow({ paymentStatus: "PAID" });
		mockTx.order.findUnique.mockResolvedValue(order);

		const session = makeStripeSession();
		const result = await processOrderTransaction("order-1", session, 600, "shr_france_123");

		// SKU validation, stock decrement and order update must NOT be called
		expect(mockTx.productSku.findMany).not.toHaveBeenCalled();
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(mockTx.cartItem.deleteMany).not.toHaveBeenCalled();

		expect(result.id).toBe("order-1");
		expect(result.orderNumber).toBe("SYN-001");
	});

	it("should throw when order is not found", async () => {
		mockTx.order.findUnique.mockResolvedValue(null);

		const session = makeStripeSession();
		await expect(
			processOrderTransaction("nonexistent-order", session, 600, "shr_france_123")
		).rejects.toThrow("Order not found: nonexistent-order");
	});

	it("should throw when SKU validation fails for an item", async () => {
		const order = makeOrderRow();
		mockTx.order.findUnique.mockResolvedValue(order);

		// SKU not found in validation query
		mockTx.productSku.findMany.mockResolvedValue([]);

		const session = makeStripeSession();
		await expect(
			processOrderTransaction("order-1", session, 600, "shr_france_123")
		).rejects.toThrow("Invalid item in order: SKU not found (SKU: sku-1, Quantity: 2)");
	});

	it("should throw with validation reason when SKU is found but invalid", async () => {
		const order = makeOrderRow();
		mockTx.order.findUnique.mockResolvedValue(order);

		mockTx.productSku.findMany.mockResolvedValue([
			{ id: "sku-1", inventory: 0, isActive: false, deletedAt: null, product: { status: "PUBLIC", deletedAt: null } },
		]);

		const session = makeStripeSession();
		await expect(
			processOrderTransaction("order-1", session, 600, "shr_france_123")
		).rejects.toThrow("Invalid item in order: invalid (active=false, stock=0, deleted=false)");
	});

	it("should deactivate out-of-stock SKUs after decrementing inventory", async () => {
		const order = makeOrderRow();
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.order.update.mockResolvedValue({});
		mockTx.productSku.update.mockResolvedValue({});
		mockTx.productSku.updateMany.mockResolvedValue({ count: 1 });
		mockTx.cartItem.deleteMany.mockResolvedValue({});

		mockTx.productSku.findMany.mockResolvedValue([
			{ id: "sku-1", inventory: 10, isActive: true, deletedAt: null, product: { status: "PUBLIC", deletedAt: null } },
		]);

		const session = makeStripeSession();
		await processOrderTransaction("order-1", session, 600, "shr_france_123");

		expect(mockTx.productSku.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["sku-1"] }, inventory: 0 },
			data: { isActive: false },
		});
	});

	it("should use the transaction with 10-second timeout", async () => {
		const order = makeOrderRow({ paymentStatus: "PAID" });
		mockTx.order.findUnique.mockResolvedValue(order);

		const session = makeStripeSession();
		await processOrderTransaction("order-1", session, 600, "shr_france_123");

		expect(mockPrisma.$transaction).toHaveBeenCalledWith(
			expect.any(Function),
			{ timeout: 10000 }
		);
	});
});

// ============================================================================
// buildPostCheckoutTasks
// ============================================================================

describe("buildPostCheckoutTasks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockGetCartInvalidationTags.mockReturnValue([
			"cart-user-user-1",
			"cart-count-user-user-1",
			"cart-summary-user-user-1",
		]);
		mockGetOrderInvalidationTags.mockReturnValue([
			"orders-list",
			"admin-badges",
			"orders-user-user-1",
			"last-order-user-user-1",
			"account-stats-user-1",
		]);
		mockProductsCacheTags.SKU_STOCK.mockImplementation((skuId: string) => `sku-stock-${skuId}`);
	});

	it("should include INVALIDATE_CACHE task with cart, order, and SKU stock tags for authenticated user", () => {
		const order = makeOrderWithItems();
		const session = makeStripeSession();

		const tasks = buildPostCheckoutTasks(order, session);

		const cacheTask = tasks.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask).toBeDefined();
		expect(cacheTask?.type === "INVALIDATE_CACHE" && cacheTask.tags).toContain("sku-stock-sku-1");
		expect(mockGetCartInvalidationTags).toHaveBeenCalledWith("user-1", undefined);
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith("user-1");
	});

	it("should not include cart invalidation tags for guest (userId is null) but still invalidate orders/dashboard", () => {
		const order = makeOrderWithItems({ userId: null });
		const session = makeStripeSession();

		const tasks = buildPostCheckoutTasks(order, session);

		expect(mockGetCartInvalidationTags).not.toHaveBeenCalled();
		// Order invalidation is always called (includes dashboard tags)
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith(undefined);

		// Still has SKU stock cache tag and INVALIDATE_CACHE task
		const cacheTask = tasks.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask).toBeDefined();
	});

	it("should include ORDER_CONFIRMATION_EMAIL task with correct data when customer email is available", () => {
		const order = makeOrderWithItems();
		const session = makeStripeSession({ customer_email: "client@example.com" });

		const tasks = buildPostCheckoutTasks(order, session);

		const emailTask = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		expect(emailTask).toBeDefined();
		if (emailTask?.type === "ORDER_CONFIRMATION_EMAIL") {
			expect(emailTask.data.to).toBe("client@example.com");
			expect(emailTask.data.orderNumber).toBe("SYN-001");
			expect(emailTask.data.customerName).toBe("Jean Dupont");
			expect(emailTask.data.items).toHaveLength(1);
			expect(emailTask.data.subtotal).toBe(5000);
			expect(emailTask.data.total).toBe(5600);
			expect(emailTask.data.trackingUrl).toBe("https://synclune.fr/orders");
		}
	});

	it("should not include ORDER_CONFIRMATION_EMAIL task when no customer email is available", () => {
		const order = makeOrderWithItems();
		const session = makeStripeSession({ customer_email: null, customer_details: null });

		const tasks = buildPostCheckoutTasks(order, session);

		const emailTask = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		expect(emailTask).toBeUndefined();
	});

	it("should always include ADMIN_NEW_ORDER_EMAIL task", () => {
		const order = makeOrderWithItems();
		const session = makeStripeSession();

		const tasks = buildPostCheckoutTasks(order, session);

		const adminEmailTask = tasks.find((t) => t.type === "ADMIN_NEW_ORDER_EMAIL");
		expect(adminEmailTask).toBeDefined();
		if (adminEmailTask?.type === "ADMIN_NEW_ORDER_EMAIL") {
			expect(adminEmailTask.data.orderNumber).toBe("SYN-001");
			expect(adminEmailTask.data.customerEmail).toBe("client@example.com");
			expect(adminEmailTask.data.dashboardUrl).toBe("https://synclune.fr/dashboard/orders/order-1");
		}
	});

	it("should use customer_details email as fallback when customer_email is null", () => {
		const order = makeOrderWithItems();
		const session = makeStripeSession({
			customer_email: null,
			customer_details: { email: "details@example.com" },
		});

		const tasks = buildPostCheckoutTasks(order, session);

		const emailTask = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		expect(emailTask).toBeDefined();
		if (emailTask?.type === "ORDER_CONFIRMATION_EMAIL") {
			expect(emailTask.data.to).toBe("details@example.com");
		}
	});

	it("should fallback to 'Client' as customerName when shipping names are null", () => {
		const order = makeOrderWithItems({
			shippingFirstName: null,
			shippingLastName: null,
		});
		const session = makeStripeSession();

		const tasks = buildPostCheckoutTasks(order, session);

		const emailTask = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		if (emailTask?.type === "ORDER_CONFIRMATION_EMAIL") {
			expect(emailTask.data.customerName).toBe("Client");
		}
	});
});

// ============================================================================
// cancelExpiredOrder
// ============================================================================

describe("cancelExpiredOrder", () => {
	const mockTx = mockPrisma._mockTx;

	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation(
			(fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
		);
	});

	it("should cancel a PENDING order and release discount usages", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			paymentStatus: "PENDING",
			orderNumber: "SYN-001",
		});

		const discountUsages = [
			{ id: "du-1", discountId: "disc-1" },
			{ id: "du-2", discountId: "disc-2" },
		];
		mockTx.discountUsage.findMany.mockResolvedValue(discountUsages);
		mockTx.discount.update.mockResolvedValue({});
		mockTx.discountUsage.deleteMany.mockResolvedValue({});
		mockTx.order.update.mockResolvedValue({});

		const result = await cancelExpiredOrder("order-1");

		expect(result).toEqual({ cancelled: true, orderNumber: "SYN-001" });

		// Each discount usage decrements the usage count
		expect(mockTx.discount.update).toHaveBeenCalledTimes(2);
		expect(mockTx.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-1" },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockTx.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-2" },
			data: { usageCount: { decrement: 1 } },
		});

		// Discount usages are deleted
		expect(mockTx.discountUsage.deleteMany).toHaveBeenCalledWith({ where: { orderId: "order-1" } });

		// Order is updated to CANCELLED/EXPIRED
		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { status: "CANCELLED", paymentStatus: "EXPIRED" },
		});
	});

	it("should cancel a PENDING order without discount usages and skip deleteMany", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			paymentStatus: "PENDING",
			orderNumber: "SYN-002",
		});

		mockTx.discountUsage.findMany.mockResolvedValue([]);
		mockTx.order.update.mockResolvedValue({});

		const result = await cancelExpiredOrder("order-2");

		expect(result).toEqual({ cancelled: true, orderNumber: "SYN-002" });
		expect(mockTx.discount.update).not.toHaveBeenCalled();
		expect(mockTx.discountUsage.deleteMany).not.toHaveBeenCalled();
		expect(mockTx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: "CANCELLED", paymentStatus: "EXPIRED" },
			})
		);
	});

	it("should skip cancellation and return false when order is already PAID", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			paymentStatus: "PAID",
			orderNumber: "SYN-003",
		});

		const result = await cancelExpiredOrder("order-3");

		expect(result).toEqual({ cancelled: false, orderNumber: "SYN-003" });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should skip cancellation and return false when order is already FAILED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			paymentStatus: "FAILED",
			orderNumber: "SYN-004",
		});

		const result = await cancelExpiredOrder("order-4");

		expect(result).toEqual({ cancelled: false, orderNumber: "SYN-004" });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return false with no orderNumber when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await cancelExpiredOrder("nonexistent-order");

		expect(result).toEqual({ cancelled: false });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should look up the order by id before entering the transaction", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		await cancelExpiredOrder("order-xyz");

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
			where: { id: "order-xyz" },
			select: { paymentStatus: true, orderNumber: true },
		});
	});
});
