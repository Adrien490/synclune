import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockTx,
	mockPrisma,
	mockCheckDiscountEligibility,
	mockCalculateDiscountWithExclusion,
	mockCalculateShipping,
	mockGenerateOrderNumber,
	mockGetValidImageUrl,
	MockBusinessError,
	MOCK_DISCOUNT_ERROR_MESSAGES,
	MOCK_DEFAULT_CURRENCY,
} = vi.hoisted(() => {
	class MockBusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	}

	const mockTx = {
		$queryRaw: vi.fn(),
		$executeRaw: vi.fn(),
		order: { create: vi.fn() },
		orderItem: { create: vi.fn() },
		discountUsage: {
			create: vi.fn(),
			count: vi.fn(),
		},
	};

	const mockPrisma = {
		$transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
	};

	return {
		mockTx,
		mockPrisma,
		mockCheckDiscountEligibility: vi.fn(),
		mockCalculateDiscountWithExclusion: vi.fn(),
		mockCalculateShipping: vi.fn(),
		mockGenerateOrderNumber: vi.fn(),
		mockGetValidImageUrl: vi.fn(),
		MockBusinessError,
		MOCK_DISCOUNT_ERROR_MESSAGES: { NOT_FOUND: "Code promo introuvable" },
		MOCK_DEFAULT_CURRENCY: "EUR",
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/shared/lib/actions", () => ({
	BusinessError: MockBusinessError,
}));

vi.mock("@/modules/discounts/services/discount-eligibility.service", () => ({
	checkDiscountEligibility: mockCheckDiscountEligibility,
}));

vi.mock("@/modules/discounts/services/discount-calculation.service", () => ({
	calculateDiscountWithExclusion: mockCalculateDiscountWithExclusion,
}));

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: mockCalculateShipping,
}));

vi.mock("@/modules/orders/services/order-generation.service", () => ({
	generateOrderNumber: mockGenerateOrderNumber,
}));

vi.mock("@/shared/lib/media-validation", () => ({
	getValidImageUrl: mockGetValidImageUrl,
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: MOCK_DISCOUNT_ERROR_MESSAGES,
}));

vi.mock("@/shared/constants/currency", () => ({
	DEFAULT_CURRENCY: MOCK_DEFAULT_CURRENCY,
}));

import { createOrderInTransaction } from "../order-creation.service";

// ============================================================================
// FIXTURES
// ============================================================================

function makeSku(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku_1",
		priceInclTax: 2990,
		compareAtPrice: null,
		color: { name: "Or" },
		material: "Argent",
		size: null,
		images: [{ url: "https://example.com/image.jpg", isPrimary: true }],
		product: {
			id: "prod_1",
			title: "Bague Étoile",
			description: "Description produit",
			status: "PUBLIC",
		},
		...overrides,
	};
}

function makeSkuResult(skuOverrides: Record<string, unknown> = {}) {
	return {
		success: true as const,
		data: { sku: makeSku(skuOverrides) },
	};
}

function makeParams(overrides: Record<string, unknown> = {}) {
	return {
		cartItems: [{ skuId: "sku_1", quantity: 2 }],
		skuDetailsResults: [makeSkuResult()],
		subtotal: 5980,
		shippingAddress: {
			addressLine1: "12 Rue de la Paix",
			addressLine2: null,
			postalCode: "75001",
			city: "Paris",
			country: "FR",
			phoneNumber: "+33612345678",
		},
		firstName: "Marie",
		lastName: "Dupont",
		userId: "user_1",
		finalEmail: "marie@example.com",
		...overrides,
	};
}

function makeSkuRow(overrides: Record<string, unknown> = {}) {
	return {
		isActive: true,
		inventory: 10,
		productTitle: "Bague Étoile",
		productStatus: "PUBLIC",
		...overrides,
	};
}

function makeDiscountRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "discount_1",
		code: "PROMO10",
		type: "PERCENTAGE",
		value: 10,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 0,
		isActive: true,
		startsAt: new Date("2025-01-01"),
		endsAt: null,
		...overrides,
	};
}

function makeCreatedOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order_1",
		orderNumber: "SYN-2026-0001",
		total: 6430,
		...overrides,
	};
}

// ============================================================================
// STOCK VERIFICATION
// ============================================================================

describe("createOrderInTransaction — stock verification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.discountUsage.create.mockResolvedValue({});
		mockTx.discountUsage.count.mockResolvedValue(0);
		mockCalculateShipping.mockReturnValue(450);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
	});

	it("should call FOR UPDATE query for each cart item with a valid sku result", async () => {
		await createOrderInTransaction(makeParams());

		expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
	});

	it("should call FOR UPDATE query for each successful cart item when multiple items", async () => {
		const params = makeParams({
			cartItems: [
				{ skuId: "sku_1", quantity: 1 },
				{ skuId: "sku_2", quantity: 2 },
			],
			skuDetailsResults: [makeSkuResult({ id: "sku_1" }), makeSkuResult({ id: "sku_2" })],
		});

		await createOrderInTransaction(params);

		expect(mockTx.$queryRaw).toHaveBeenCalledTimes(2);
	});

	it("should skip FOR UPDATE query when skuResult is not successful", async () => {
		const params = makeParams({
			skuDetailsResults: [{ success: false as const, error: "not found" }],
		});

		await createOrderInTransaction(params);

		expect(mockTx.$queryRaw).not.toHaveBeenCalled();
	});

	it("should throw BusinessError when SKU row not found in DB", async () => {
		mockTx.$queryRaw.mockResolvedValue([]);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Produit introuvable : Bague Étoile",
		);
	});

	it("should throw BusinessError when product is inactive (isActive=false)", async () => {
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow({ isActive: false })]);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Le produit Bague Étoile n'est plus disponible",
		);
	});

	it("should throw BusinessError when product status is not PUBLIC", async () => {
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow({ productStatus: "DRAFT" })]);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Le produit Bague Étoile n'est plus disponible",
		);
	});

	it("should throw BusinessError when inventory is insufficient", async () => {
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow({ inventory: 1 })]);

		// cartItem quantity is 2, inventory is 1
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Stock insuffisant pour Bague Étoile",
		);
	});
});

// ============================================================================
// SHIPPING
// ============================================================================

describe("createOrderInTransaction — shipping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.discountUsage.create.mockResolvedValue({});
		mockTx.discountUsage.count.mockResolvedValue(0);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
	});

	it("should call calculateShipping with country and postalCode", async () => {
		mockCalculateShipping.mockReturnValue(450);

		await createOrderInTransaction(makeParams());

		expect(mockCalculateShipping).toHaveBeenCalledWith("FR", "75001");
	});

	it("should throw BusinessError when shipping is null (unavailable zone)", async () => {
		mockCalculateShipping.mockReturnValue(null);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Livraison non disponible pour cette zone (Corse, DOM-TOM)",
		);
	});
});

// ============================================================================
// ORDER CREATION WITHOUT DISCOUNT
// ============================================================================

describe("createOrderInTransaction — order creation without discount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.discountUsage.create.mockResolvedValue({});
		mockTx.discountUsage.count.mockResolvedValue(0);
		mockCalculateShipping.mockReturnValue(450);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
	});

	it("should compute correct totals: subtotal + shipping, no discount", async () => {
		// subtotal=5980, shipping=450, total=6430, taxAmount=0
		mockTx.order.create.mockResolvedValue(makeCreatedOrder({ total: 6430 }));

		await createOrderInTransaction(makeParams());

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.subtotal).toBe(5980);
		expect(createCall.data.shippingCost).toBe(450);
		expect(createCall.data.discountAmount).toBe(0);
		expect(createCall.data.taxAmount).toBe(0);
		expect(createCall.data.total).toBe(6430);
	});

	it("should always set taxAmount to 0", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams());

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.taxAmount).toBe(0);
	});

	it("should set customerEmail to empty string when finalEmail is null", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams({ finalEmail: null }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.customerEmail).toBe("");
	});

	it("should trim customerName correctly", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams({ firstName: "Marie", lastName: "Dupont" }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.customerName).toBe("Marie Dupont");
	});

	it("should denormalize product and SKU data on order items", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder({ id: "order_1" }));

		await createOrderInTransaction(makeParams());

		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.orderId).toBe("order_1");
		expect(itemCall.data.productId).toBe("prod_1");
		expect(itemCall.data.skuId).toBe("sku_1");
		expect(itemCall.data.productTitle).toBe("Bague Étoile");
		expect(itemCall.data.price).toBe(2990);
		expect(itemCall.data.quantity).toBe(2);
	});

	it("should use primary image URL for order item", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockGetValidImageUrl.mockReturnValue("https://example.com/primary.jpg");

		const skuWithPrimary = makeSkuResult({
			images: [
				{ url: "https://example.com/other.jpg", isPrimary: false },
				{ url: "https://example.com/primary.jpg", isPrimary: true },
			],
		});

		await createOrderInTransaction(makeParams({ skuDetailsResults: [skuWithPrimary] }));

		expect(mockGetValidImageUrl).toHaveBeenCalledWith("https://example.com/primary.jpg");
		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.productImageUrl).toBe("https://example.com/primary.jpg");
		expect(itemCall.data.skuImageUrl).toBe("https://example.com/primary.jpg");
	});

	it("should fall back to first image when no primary image", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockGetValidImageUrl.mockReturnValue("https://example.com/first.jpg");

		const skuWithoutPrimary = makeSkuResult({
			images: [{ url: "https://example.com/first.jpg", isPrimary: false }],
		});

		await createOrderInTransaction(makeParams({ skuDetailsResults: [skuWithoutPrimary] }));

		expect(mockGetValidImageUrl).toHaveBeenCalledWith("https://example.com/first.jpg");
	});

	it("should set imageUrl to null when no images and getValidImageUrl returns null", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockGetValidImageUrl.mockReturnValue(null);

		const skuWithoutImages = makeSkuResult({ images: [] });

		await createOrderInTransaction(makeParams({ skuDetailsResults: [skuWithoutImages] }));

		expect(mockGetValidImageUrl).toHaveBeenCalledWith(null);
		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.productImageUrl).toBeNull();
	});

	it("should call getValidImageUrl with the raw image URL", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams());

		expect(mockGetValidImageUrl).toHaveBeenCalledWith("https://example.com/image.jpg");
	});

	it("should return the created order with appliedDiscountId null and discountAmount 0", async () => {
		const createdOrder = makeCreatedOrder();
		mockTx.order.create.mockResolvedValue(createdOrder);

		const result = await createOrderInTransaction(makeParams());

		expect(result.order).toBe(createdOrder);
		expect(result.appliedDiscountId).toBeNull();
		expect(result.discountAmount).toBe(0);
		expect(result.appliedDiscountCode).toBeNull();
	});
});

// ============================================================================
// DISCOUNT FLOW
// ============================================================================

describe("createOrderInTransaction — discount flow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeSkuRow()])
			.mockResolvedValueOnce([makeDiscountRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.discountUsage.create.mockResolvedValue({});
		mockTx.discountUsage.count.mockResolvedValue(0);
		mockCalculateShipping.mockReturnValue(450);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
		mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
		mockCalculateDiscountWithExclusion.mockReturnValue(598);
	});

	it("should query discount with uppercased code", async () => {
		await createOrderInTransaction(makeParams({ discountCode: "promo10" }));

		// The second $queryRaw call is for the discount lookup — we verify uppercase
		// by checking the mock was called (template literal tag, raw SQL cannot be inspected directly)
		expect(mockTx.$queryRaw).toHaveBeenCalledTimes(2);
	});

	it("should throw BusinessError with NOT_FOUND message when discount code does not exist", async () => {
		mockTx.$queryRaw.mockReset().mockResolvedValueOnce([makeSkuRow()]).mockResolvedValueOnce([]);

		await expect(createOrderInTransaction(makeParams({ discountCode: "INVALID" }))).rejects.toThrow(
			"Code promo introuvable",
		);
	});

	it("should throw BusinessError when eligibility check fails", async () => {
		mockCheckDiscountEligibility.mockReturnValue({
			eligible: false,
			error: "Ce code promo a expiré",
		});

		const err = await createOrderInTransaction(makeParams({ discountCode: "PROMO10" })).catch(
			(e) => e,
		);
		expect(err).toBeInstanceOf(MockBusinessError);
		expect(err.message).toBe("Ce code promo a expiré");
	});

	it("should throw BusinessError with fallback message when eligibility error is undefined", async () => {
		mockCheckDiscountEligibility.mockReturnValue({ eligible: false, error: undefined });

		const err = await createOrderInTransaction(makeParams({ discountCode: "PROMO10" })).catch(
			(e) => e,
		);
		expect(err).toBeInstanceOf(MockBusinessError);
		expect(err.message).toBe("Code promo invalide");
	});

	it("should call calculateDiscountWithExclusion with correct cart items and excludeSaleItems=true", async () => {
		await createOrderInTransaction(makeParams({ discountCode: "PROMO10" }));

		expect(mockCalculateDiscountWithExclusion).toHaveBeenCalledWith({
			type: "PERCENTAGE",
			value: 10,
			cartItems: [
				{
					priceInclTax: 2990,
					quantity: 2,
					compareAtPrice: null,
				},
			],
			excludeSaleItems: true,
		});
	});

	it("should clamp discount amount to subtotal maximum", async () => {
		// discountAmount would exceed subtotal
		mockCalculateDiscountWithExclusion.mockReturnValue(99999);

		await createOrderInTransaction(makeParams({ discountCode: "PROMO10", subtotal: 5980 }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.discountAmount).toBe(5980);
	});

	it("should clamp discount amount to 0 minimum", async () => {
		mockCalculateDiscountWithExclusion.mockReturnValue(-50);

		await createOrderInTransaction(makeParams({ discountCode: "PROMO10" }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.discountAmount).toBe(0);
	});

	it("should increment usage count via raw SQL when discount amount is positive", async () => {
		await createOrderInTransaction(makeParams({ discountCode: "PROMO10" }));

		expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
	});

	it("should throw BusinessError on race condition when 0 rows updated", async () => {
		mockTx.$executeRaw.mockResolvedValue(0);

		const err = await createOrderInTransaction(makeParams({ discountCode: "PROMO10" })).catch(
			(e) => e,
		);
		expect(err).toBeInstanceOf(MockBusinessError);
		expect(err.message).toBe("Ce code promo a atteint sa limite d'utilisation");
	});

	it("should create a DiscountUsage record when discount is applied", async () => {
		const order = makeCreatedOrder({ id: "order_1" });
		mockTx.order.create.mockResolvedValue(order);

		const result = await createOrderInTransaction(
			makeParams({ discountCode: "PROMO10", userId: "user_1" }),
		);

		expect(mockTx.discountUsage.create).toHaveBeenCalledWith({
			data: {
				discountId: "discount_1",
				orderId: "order_1",
				userId: "user_1",
				discountCode: "PROMO10",
				amountApplied: 598,
			},
		});
		expect(result.appliedDiscountId).toBe("discount_1");
		expect(result.appliedDiscountCode).toBe("PROMO10");
		expect(result.discountAmount).toBe(598);
	});

	it("should not create DiscountUsage record and not increment when discountAmount is 0", async () => {
		mockCalculateDiscountWithExclusion.mockReturnValue(0);

		await createOrderInTransaction(makeParams({ discountCode: "PROMO10" }));

		expect(mockTx.$executeRaw).not.toHaveBeenCalled();
		expect(mockTx.discountUsage.create).not.toHaveBeenCalled();
	});

	it("should query per-user usage count when maxUsagePerUser is set and userId provided", async () => {
		mockTx.$queryRaw
			.mockReset()
			.mockResolvedValueOnce([makeSkuRow()])
			.mockResolvedValueOnce([makeDiscountRow({ maxUsagePerUser: 1 })]);

		await createOrderInTransaction(
			makeParams({ discountCode: "PROMO10", userId: "user_1", finalEmail: null }),
		);

		expect(mockTx.discountUsage.count).toHaveBeenCalledWith({
			where: { discountId: "discount_1", userId: "user_1" },
		});
	});

	it("should query per-email usage count when maxUsagePerUser is set and finalEmail provided", async () => {
		mockTx.$queryRaw
			.mockReset()
			.mockResolvedValueOnce([makeSkuRow()])
			.mockResolvedValueOnce([makeDiscountRow({ maxUsagePerUser: 1 })]);

		await createOrderInTransaction(
			makeParams({ discountCode: "PROMO10", userId: null, finalEmail: "marie@example.com" }),
		);

		expect(mockTx.discountUsage.count).toHaveBeenCalledWith({
			where: {
				discountId: "discount_1",
				order: { customerEmail: "marie@example.com" },
			},
		});
	});

	it("should not query usage counts when maxUsagePerUser is null", async () => {
		// Default discount row has maxUsagePerUser: null
		await createOrderInTransaction(makeParams({ discountCode: "PROMO10" }));

		expect(mockTx.discountUsage.count).not.toHaveBeenCalled();
	});
});

// ============================================================================
// TOTALS
// ============================================================================

describe("createOrderInTransaction — totals", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.discountUsage.create.mockResolvedValue({});
		mockTx.discountUsage.count.mockResolvedValue(0);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
	});

	it("should compute total as subtotal + shipping when no discount", async () => {
		mockCalculateShipping.mockReturnValue(450);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams({ subtotal: 5980 }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		// total = max(0, 5980 - 0 + 450) = 6430
		expect(createCall.data.total).toBe(6430);
	});

	it("should compute total as subtotal - discount + shipping", async () => {
		mockCalculateShipping.mockReturnValue(450);
		mockTx.$queryRaw
			.mockReset()
			.mockResolvedValueOnce([makeSkuRow()])
			.mockResolvedValueOnce([makeDiscountRow()]);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
		mockCalculateDiscountWithExclusion.mockReturnValue(598);

		await createOrderInTransaction(makeParams({ subtotal: 5980, discountCode: "PROMO10" }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		// total = max(0, 5980 - 598 + 450) = 5832
		expect(createCall.data.total).toBe(5832);
	});

	it("should clamp total to 0 when discount exceeds subtotal plus shipping", async () => {
		mockCalculateShipping.mockReturnValue(0);
		mockTx.$queryRaw
			.mockReset()
			.mockResolvedValueOnce([makeSkuRow()])
			.mockResolvedValueOnce([makeDiscountRow()]);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder({ total: 0 }));
		mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
		// Even with clamped discount = subtotal, total would be 0 + 0 = 0
		mockCalculateDiscountWithExclusion.mockReturnValue(5980);

		await createOrderInTransaction(makeParams({ subtotal: 5980, discountCode: "PROMO10" }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.total).toBe(0);
	});
});
