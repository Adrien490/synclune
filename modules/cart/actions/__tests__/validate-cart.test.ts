import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockCheckCartRateLimit, mockValidateCartItems } = vi.hoisted(() => ({
	mockPrisma: {
		cart: { findFirst: vi.fn() },
	},
	mockCheckCartRateLimit: vi.fn(),
	mockValidateCartItems: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { VALIDATE: "cart-validate" },
}));

vi.mock("../../services/item-availability.service", () => ({
	validateCartItems: mockValidateCartItems,
}));

import { validateCart, isCartValid } from "../validate-cart";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_USER_ID = "user_cm1234567890abcdef";
const VALID_SESSION_ID = "sess-abc123";
const VALID_CART_ID = "cart_cm1234567890abcde";
const VALID_SKU_ID = "sku_cm1234567890abcdefg";
const VALID_PRODUCT_ID = "prod_cm1234567890abcde";

function makeSuccessRateLimit(userId = VALID_USER_ID, sessionId: string | null = null) {
	return {
		success: true,
		context: { userId, sessionId },
	};
}

function createMockCartItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "item_cm1234567890abcde",
		skuId: VALID_SKU_ID,
		quantity: 1,
		sku: {
			id: VALID_SKU_ID,
			isActive: true,
			inventory: 10,
			deletedAt: null,
			product: {
				id: VALID_PRODUCT_ID,
				title: "Bracelet Lune",
				status: "PUBLIC",
				deletedAt: null,
			},
		},
		...overrides,
	};
}

function createMockCart(items: unknown[] = [createMockCartItem()]) {
	return {
		id: VALID_CART_ID,
		items,
	};
}

function createValidationIssue(overrides: Record<string, unknown> = {}) {
	return {
		cartItemId: "item_cm1234567890abcde",
		skuId: VALID_SKU_ID,
		productTitle: "Bracelet Lune",
		issueType: "OUT_OF_STOCK",
		message: "Cet article n'est plus en stock",
		...overrides,
	};
}

// ============================================================================
// TESTS - validateCart
// ============================================================================

describe("validateCart", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockCheckCartRateLimit.mockResolvedValue(makeSuccessRateLimit());
		mockPrisma.cart.findFirst.mockResolvedValue(createMockCart());
		mockValidateCartItems.mockReturnValue([]);
	});

	it("should return rateLimited=true when rate limited", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "Trop de requetes" },
		});

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.rateLimited).toBe(true);
		expect(result.issues).toEqual([]);
		expect(mockPrisma.cart.findFirst).not.toHaveBeenCalled();
	});

	it("should return isValid=false when neither userId nor sessionId is present", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: null },
		});

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues).toEqual([]);
		expect(result.rateLimited).toBeUndefined();
		expect(mockPrisma.cart.findFirst).not.toHaveBeenCalled();
	});

	it("should return isValid=false when cart is not found", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(null);

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues).toEqual([]);
	});

	it("should query cart by userId when user is logged in", async () => {
		await validateCart();

		expect(mockPrisma.cart.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: VALID_USER_ID } }),
		);
	});

	it("should query cart by sessionId when user is not logged in", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: VALID_SESSION_ID },
		});

		await validateCart();

		expect(mockPrisma.cart.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { sessionId: VALID_SESSION_ID } }),
		);
	});

	it("should return isValid=true and empty issues when cart has no problems", async () => {
		mockValidateCartItems.mockReturnValue([]);

		const result = await validateCart();

		expect(result.isValid).toBe(true);
		expect(result.issues).toEqual([]);
	});

	it("should return isValid=false with issues when stock is insufficient", async () => {
		const issue = createValidationIssue({ issueType: "INSUFFICIENT_STOCK", availableStock: 2 });
		mockValidateCartItems.mockReturnValue([issue]);

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]!.issueType).toBe("INSUFFICIENT_STOCK");
	});

	it("should return isValid=false with issues when item is out of stock", async () => {
		const issue = createValidationIssue({ issueType: "OUT_OF_STOCK", availableStock: 0 });
		mockValidateCartItems.mockReturnValue([issue]);

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]!.issueType).toBe("OUT_OF_STOCK");
	});

	it("should return isValid=false with issues when product is not public", async () => {
		const issue = createValidationIssue({ issueType: "NOT_PUBLIC" });
		mockValidateCartItems.mockReturnValue([issue]);

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues[0]!.issueType).toBe("NOT_PUBLIC");
	});

	it("should return isValid=false with issues when SKU is inactive", async () => {
		const issue = createValidationIssue({ issueType: "INACTIVE" });
		mockValidateCartItems.mockReturnValue([issue]);

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues[0]!.issueType).toBe("INACTIVE");
	});

	it("should return isValid=false with issues when product is deleted", async () => {
		const issue = createValidationIssue({ issueType: "DELETED" });
		mockValidateCartItems.mockReturnValue([issue]);

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues[0]!.issueType).toBe("DELETED");
	});

	it("should accumulate multiple issues across different cart items", async () => {
		const issues = [
			createValidationIssue({ cartItemId: "item-1", issueType: "OUT_OF_STOCK" }),
			createValidationIssue({ cartItemId: "item-2", issueType: "INACTIVE" }),
		];
		mockValidateCartItems.mockReturnValue(issues);

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues).toHaveLength(2);
	});

	it("should pass cart items to validateCartItems service", async () => {
		const items = [createMockCartItem()];
		mockPrisma.cart.findFirst.mockResolvedValue(createMockCart(items));

		await validateCart();

		expect(mockValidateCartItems).toHaveBeenCalledWith(items);
	});

	it("should return structured error issue on unexpected exception", async () => {
		mockPrisma.cart.findFirst.mockRejectedValue(new Error("DB connection lost"));

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]!.issueType).toBe("UNKNOWN");
		expect(result.issues[0]!.cartItemId).toBe("unknown");
		expect(result.issues[0]!.message).toContain("erreur");
	});
});

// ============================================================================
// TESTS - isCartValid
// ============================================================================

describe("isCartValid", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockCheckCartRateLimit.mockResolvedValue(makeSuccessRateLimit());
		mockPrisma.cart.findFirst.mockResolvedValue(createMockCart());
		mockValidateCartItems.mockReturnValue([]);
	});

	it("should return true when cart is valid", async () => {
		mockValidateCartItems.mockReturnValue([]);

		const result = await isCartValid();

		expect(result).toBe(true);
	});

	it("should return false when cart has issues", async () => {
		mockValidateCartItems.mockReturnValue([createValidationIssue()]);

		const result = await isCartValid();

		expect(result).toBe(false);
	});

	it("should return false when cart is not found", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(null);

		const result = await isCartValid();

		expect(result).toBe(false);
	});

	it("should return false when rate limited", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "Rate limited" },
		});

		const result = await isCartValid();

		expect(result).toBe(false);
	});
});
