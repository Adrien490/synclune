import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockCheckCartRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockForbidden,
	mockBusinessError,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
	mockGetCartExpirationDate,
} = vi.hoisted(() => {
	class MockBusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	}
	return {
		mockCheckCartRateLimit: vi.fn(),
		mockValidateInput: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
		mockForbidden: vi.fn(),
		mockBusinessError: MockBusinessError,
		mockPrisma: {
			cartItem: { findUnique: vi.fn(), update: vi.fn() },
			cart: { update: vi.fn() },
			$transaction: vi.fn(),
		},
		mockUpdateTag: vi.fn(),
		mockGetCartInvalidationTags: vi.fn(),
		mockGetCartExpirationDate: vi.fn(),
	};
});

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { UPDATE: "update" },
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	forbidden: mockForbidden,
	BusinessError: mockBusinessError,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: {
		PRODUCT_CARTS: (id: string) => `product-carts-${id}`,
	},
}));

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getCartExpirationDate: mockGetCartExpirationDate,
}));

vi.mock("../../schemas/cart.schemas", () => ({
	updateCartItemSchema: {},
}));

vi.mock("../../constants/error-messages", () => ({
	CART_ERROR_MESSAGES: {
		SKU_INACTIVE: "Ce produit n'est plus disponible",
		PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible à la vente",
		QUANTITY_MAX: "Quantité maximale dépassée",
		INSUFFICIENT_STOCK: "Stock insuffisant",
	},
}));

vi.mock("../../constants/cart", () => ({
	MAX_QUANTITY_PER_ORDER: 10,
}));

import { updateCartItem } from "../update-cart-item";

// ============================================================================
// Factories
// ============================================================================

function makeFormData(cartItemId = "item-1", quantity = 2) {
	const fd = new FormData();
	fd.set("cartItemId", cartItemId);
	fd.set("quantity", String(quantity));
	return fd;
}

function makeCartItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "item-1",
		cartId: "cart-1",
		skuId: "sku-1",
		quantity: 1,
		cart: { userId: "user-1", sessionId: null },
		sku: { productId: "prod-1" },
		...overrides,
	};
}

function makeTxWithSku(skuOverrides: Record<string, unknown> = {}) {
	const mockCartItemUpdate = vi.fn();
	const mockCartUpdate = vi.fn();
	const mockQueryRaw = vi.fn().mockResolvedValue([
		{
			inventory: 10,
			isActive: true,
			deletedAt: null,
			productStatus: "PUBLIC",
			productDeletedAt: null,
			...skuOverrides,
		},
	]);

	return {
		tx: {
			$queryRaw: mockQueryRaw,
			cartItem: { update: mockCartItemUpdate },
			cart: { update: mockCartUpdate },
		},
		mockCartItemUpdate,
		mockCartUpdate,
		mockQueryRaw,
	};
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockValidateInput.mockReturnValue({ data: { cartItemId: "item-1", quantity: 2 } });
	mockPrisma.cartItem.findUnique.mockResolvedValue(makeCartItem());

	const { tx } = makeTxWithSku();
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockGetCartExpirationDate.mockReturnValue(new Date("2030-01-01"));
	mockSuccess.mockImplementation((msg: string) => ({ status: "success", message: msg }));
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

// ============================================================================
// Tests
// ============================================================================

describe("updateCartItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns error when rate limited", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "Rate limited" },
		});

		const result = await updateCartItem(undefined, makeFormData());
		expect(result).toEqual({ status: "error", message: "Rate limited" });
	});

	it("returns error on validation failure", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: "validation_error", message: "Invalid" },
		});

		const result = await updateCartItem(undefined, makeFormData());
		expect(result).toEqual({ status: "validation_error", message: "Invalid" });
	});

	it("returns error when item not found", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);

		await updateCartItem(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith("Article introuvable dans le panier");
	});

	it("returns forbidden when userId does not match", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue(
			makeCartItem({ cart: { userId: "other-user", sessionId: null } }),
		);

		await updateCartItem(undefined, makeFormData());
		expect(mockForbidden).toHaveBeenCalled();
	});

	it("returns forbidden when sessionId does not match", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: "sess-1" },
		});
		mockPrisma.cartItem.findUnique.mockResolvedValue(
			makeCartItem({ cart: { userId: null, sessionId: "other-sess" } }),
		);

		await updateCartItem(undefined, makeFormData());
		expect(mockForbidden).toHaveBeenCalled();
	});

	it("returns success (no-op) when quantity unchanged", async () => {
		mockValidateInput.mockReturnValue({ data: { cartItemId: "item-1", quantity: 1 } });
		mockPrisma.cartItem.findUnique.mockResolvedValue(makeCartItem({ quantity: 1 }));

		await updateCartItem(undefined, makeFormData("item-1", 1));
		expect(mockSuccess).toHaveBeenCalledWith("Quantité mise à jour (1)");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("throws BusinessError for inactive SKU", async () => {
		const { tx } = makeTxWithSku({ isActive: false });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await updateCartItem(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("throws BusinessError for deleted SKU", async () => {
		const { tx } = makeTxWithSku({ deletedAt: new Date() });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await updateCartItem(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("throws BusinessError for non-PUBLIC product", async () => {
		const { tx } = makeTxWithSku({ productStatus: "DRAFT" });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await updateCartItem(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("throws BusinessError when quantity exceeds stock", async () => {
		mockValidateInput.mockReturnValue({ data: { cartItemId: "item-1", quantity: 5 } });
		const { tx } = makeTxWithSku({ inventory: 3 });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await updateCartItem(undefined, makeFormData("item-1", 5));
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("updates quantity and cart in transaction", async () => {
		const { tx, mockCartItemUpdate, mockCartUpdate } = makeTxWithSku();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await updateCartItem(undefined, makeFormData());
		expect(mockCartItemUpdate).toHaveBeenCalledWith({
			where: { id: "item-1" },
			data: { quantity: 2 },
		});
		expect(mockCartUpdate).toHaveBeenCalled();
	});

	it("sets cart expiration for guest", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: "sess-1" },
		});
		mockPrisma.cartItem.findUnique.mockResolvedValue(
			makeCartItem({ cart: { userId: null, sessionId: "sess-1" } }),
		);
		const expDate = new Date("2030-01-01");
		mockGetCartExpirationDate.mockReturnValue(expDate);

		const { tx, mockCartUpdate } = makeTxWithSku();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await updateCartItem(undefined, makeFormData());
		expect(mockCartUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ expiresAt: expDate }),
			}),
		);
	});

	it("invalidates cache tags", async () => {
		await updateCartItem(undefined, makeFormData());
		expect(mockGetCartInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
	});

	it("calls handleActionError on exception", async () => {
		const err = new Error("DB error");
		mockPrisma.cartItem.findUnique.mockRejectedValue(err);

		await updateCartItem(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalledWith(
			err,
			"Une erreur est survenue lors de la mise à jour",
		);
	});
});
