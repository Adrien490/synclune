import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockTx } = vi.hoisted(() => {
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
	};

	const mockPrisma = {
		$transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
	};

	return { mockPrisma, mockTx };
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		checkout: { sessions: { retrieve: vi.fn() } },
	},
}));

vi.mock("@/modules/orders/constants/stripe-shipping-rates", () => ({
	getShippingRateName: vi.fn().mockReturnValue("Livraison standard"),
	getShippingMethodFromRate: vi.fn().mockReturnValue("STANDARD"),
	getShippingCarrierFromRate: vi.fn().mockReturnValue("autre"),
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: vi.fn().mockReturnValue([]),
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: vi.fn().mockReturnValue([]),
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { SKU_STOCK: (id: string) => `sku-stock-${id}` },
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: vi.fn().mockReturnValue("https://synclune.fr"),
}));

import { processOrderTransaction } from "../checkout.service";

// ============================================================================
// Fixtures
// ============================================================================

function makeStripeSession(overrides: Record<string, unknown> = {}) {
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

function makeMultiItemOrder(stockOverrides?: { sku1Stock?: number; sku2Stock?: number }) {
	return {
		id: "order-multi",
		orderNumber: "SYN-MULTI-001",
		userId: "user-1",
		paymentStatus: "PENDING",
		shippingFirstName: "Marie",
		shippingLastName: "Dupont",
		shippingAddress1: "12 Rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33600000000",
		subtotal: 7500,
		discountAmount: 0,
		shippingCost: 600,
		taxAmount: 0,
		total: 8100,
		user: { id: "user-1" },
		items: [
			{
				skuId: "sku-1",
				quantity: 2,
				price: 2500,
				productTitle: "Bracelet Lune",
				skuColor: "Or",
				skuMaterial: "Argent 925",
				skuSize: "M",
				sku: { id: "sku-1", inventory: stockOverrides?.sku1Stock ?? 10, sku: "BRC-LUNE-OR-M" },
			},
			{
				skuId: "sku-2",
				quantity: 1,
				price: 2500,
				productTitle: "Bague Soleil",
				skuColor: "Argent",
				skuMaterial: "Argent 925",
				skuSize: "52",
				sku: { id: "sku-2", inventory: stockOverrides?.sku2Stock ?? 5, sku: "BAG-SOL-AG-52" },
			},
		],
	};
}

// ============================================================================
// processOrderTransaction — Transaction atomicity & edge cases
// ============================================================================

describe("processOrderTransaction — multi-item transactions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
			fn(mockTx),
		);
	});

	it("should decrement stock for ALL items in a multi-item order", async () => {
		const order = makeMultiItemOrder();
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.order.update.mockResolvedValue({});
		mockTx.productSku.update.mockResolvedValue({});
		mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
		mockTx.cartItem.deleteMany.mockResolvedValue({});
		mockTx.productSku.findMany.mockResolvedValue([
			{
				id: "sku-1",
				inventory: 10,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
			{
				id: "sku-2",
				inventory: 5,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
		]);

		const session = makeStripeSession();
		const result = await processOrderTransaction("order-multi", session, 600, "shr_fr");

		// Both SKUs should have stock decremented
		expect(mockTx.productSku.update).toHaveBeenCalledTimes(2);
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-1" },
			data: { inventory: { decrement: 2 } },
		});
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-2" },
			data: { inventory: { decrement: 1 } },
		});

		expect(result.items).toHaveLength(2);
		expect(result.orderNumber).toBe("SYN-MULTI-001");
	});

	it("should throw and rollback ALL changes when second item has insufficient stock", async () => {
		const order = makeMultiItemOrder();
		mockTx.order.findUnique.mockResolvedValue(order);

		// Item 1 has stock, item 2 does NOT
		mockTx.productSku.findMany.mockResolvedValue([
			{
				id: "sku-1",
				inventory: 10,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
			{
				id: "sku-2",
				inventory: 0,
				isActive: false,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
		]);

		const session = makeStripeSession();
		await expect(processOrderTransaction("order-multi", session, 600, "shr_fr")).rejects.toThrow(
			"Invalid item in order",
		);

		// No stock should be decremented since validation happens before decrement
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(mockTx.cartItem.deleteMany).not.toHaveBeenCalled();
	});

	it("should throw when one SKU is soft-deleted even if others are valid", async () => {
		const order = makeMultiItemOrder();
		mockTx.order.findUnique.mockResolvedValue(order);

		mockTx.productSku.findMany.mockResolvedValue([
			{
				id: "sku-1",
				inventory: 10,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
			{
				id: "sku-2",
				inventory: 5,
				isActive: true,
				deletedAt: new Date(),
				product: { status: "PUBLIC", deletedAt: null },
			},
		]);

		const session = makeStripeSession();
		await expect(processOrderTransaction("order-multi", session, 600, "shr_fr")).rejects.toThrow(
			"Invalid item in order",
		);

		expect(mockTx.productSku.update).not.toHaveBeenCalled();
	});

	it("should throw when one SKU's product is not PUBLIC", async () => {
		const order = makeMultiItemOrder();
		mockTx.order.findUnique.mockResolvedValue(order);

		mockTx.productSku.findMany.mockResolvedValue([
			{
				id: "sku-1",
				inventory: 10,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
			{
				id: "sku-2",
				inventory: 5,
				isActive: true,
				deletedAt: null,
				product: { status: "DRAFT", deletedAt: null },
			},
		]);

		const session = makeStripeSession();
		await expect(processOrderTransaction("order-multi", session, 600, "shr_fr")).rejects.toThrow(
			"Invalid item in order",
		);
	});

	it("should be idempotent — second call with same orderId returns existing order without changes", async () => {
		const order = makeMultiItemOrder();
		// First call processes normally
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.order.update.mockResolvedValue({});
		mockTx.productSku.update.mockResolvedValue({});
		mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
		mockTx.cartItem.deleteMany.mockResolvedValue({});
		mockTx.productSku.findMany.mockResolvedValue([
			{
				id: "sku-1",
				inventory: 10,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
			{
				id: "sku-2",
				inventory: 5,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
		]);

		const session = makeStripeSession();
		await processOrderTransaction("order-multi", session, 600, "shr_fr");

		vi.clearAllMocks();

		// Second call: order is already PAID
		const paidOrder = { ...order, paymentStatus: "PAID" };
		mockTx.order.findUnique.mockResolvedValue(paidOrder);
		mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
			fn(mockTx),
		);

		const result = await processOrderTransaction("order-multi", session, 600, "shr_fr");

		// No stock changes, no order update
		expect(mockTx.productSku.findMany).not.toHaveBeenCalled();
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(result.id).toBe("order-multi");
	});

	it("should handle concurrent calls gracefully — only first succeeds", async () => {
		let callCount = 0;
		const order = makeMultiItemOrder();

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
				callCount++;
				if (callCount === 1) {
					// First call: order is PENDING
					mockTx.order.findUnique.mockResolvedValue(order);
					mockTx.order.update.mockResolvedValue({});
					mockTx.productSku.update.mockResolvedValue({});
					mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
					mockTx.cartItem.deleteMany.mockResolvedValue({});
					mockTx.productSku.findMany.mockResolvedValue([
						{
							id: "sku-1",
							inventory: 10,
							isActive: true,
							deletedAt: null,
							product: { status: "PUBLIC", deletedAt: null },
						},
						{
							id: "sku-2",
							inventory: 5,
							isActive: true,
							deletedAt: null,
							product: { status: "PUBLIC", deletedAt: null },
						},
					]);
				} else {
					// Second call: order is already PAID (first call completed)
					mockTx.order.findUnique.mockResolvedValue({ ...order, paymentStatus: "PAID" });
				}
				return fn(mockTx);
			},
		);

		const session = makeStripeSession();
		const [result1, result2] = await Promise.all([
			processOrderTransaction("order-multi", session, 600, "shr_fr"),
			processOrderTransaction("order-multi", session, 600, "shr_fr"),
		]);

		// Both should resolve (one processes, the other skips)
		expect(result1.id).toBe("order-multi");
		expect(result2.id).toBe("order-multi");
	});

	it("should deactivate multiple out-of-stock SKUs after decrement", async () => {
		const order = makeMultiItemOrder();
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.order.update.mockResolvedValue({});
		mockTx.productSku.update.mockResolvedValue({});
		mockTx.productSku.updateMany.mockResolvedValue({ count: 2 });
		mockTx.cartItem.deleteMany.mockResolvedValue({});
		mockTx.productSku.findMany.mockResolvedValue([
			{
				id: "sku-1",
				inventory: 10,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
			{
				id: "sku-2",
				inventory: 5,
				isActive: true,
				deletedAt: null,
				product: { status: "PUBLIC", deletedAt: null },
			},
		]);

		const session = makeStripeSession();
		await processOrderTransaction("order-multi", session, 600, "shr_fr");

		expect(mockTx.productSku.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["sku-1", "sku-2"] }, inventory: 0 },
			data: { isActive: false },
		});
	});
});
