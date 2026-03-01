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
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
} = vi.hoisted(() => ({
	mockCheckCartRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockPrisma: {
		cartItem: { findUnique: vi.fn() },
		$transaction: vi.fn(),
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { REMOVE: "remove" },
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

vi.mock("../../schemas/cart.schemas", () => ({
	removeFromCartSchema: {},
}));

import { removeFromCart } from "../remove-from-cart";

// ============================================================================
// Factories
// ============================================================================

function makeFormData(cartItemId = "item-1") {
	const fd = new FormData();
	fd.set("cartItemId", cartItemId);
	return fd;
}

function makeCartItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "item-1",
		cartId: "cart-1",
		skuId: "sku-1",
		cart: { userId: "user-1", sessionId: null },
		sku: { productId: "product-1" },
		...overrides,
	};
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockValidateInput.mockReturnValue({ data: { cartItemId: "item-1" } });
	mockPrisma.cartItem.findUnique.mockResolvedValue(makeCartItem());
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
		fn({ cartItem: { delete: vi.fn() }, cart: { update: vi.fn() } }),
	);
	mockGetCartInvalidationTags.mockReturnValue(["cart-tag-1", "cart-tag-2"]);
	mockSuccess.mockReturnValue({ status: "success", message: "OK" });
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

// ============================================================================
// Tests
// ============================================================================

describe("removeFromCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns error when rate limited", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "Rate limited" },
		});

		const result = await removeFromCart(undefined, makeFormData());
		expect(result).toEqual({ status: "error", message: "Rate limited" });
	});

	it("returns error on validation failure", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: "validation_error", message: "ID invalide" },
		});

		const result = await removeFromCart(undefined, makeFormData());
		expect(result).toEqual({ status: "validation_error", message: "ID invalide" });
	});

	it("returns error when cart item not found", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);

		await removeFromCart(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith("Article introuvable dans le panier");
	});

	it("returns error when userId does not match owner", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue(
			makeCartItem({ cart: { userId: "other-user", sessionId: null } }),
		);

		await removeFromCart(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith("Acces non autorise");
	});

	it("returns error when sessionId does not match owner", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: "sess-1" },
		});
		mockPrisma.cartItem.findUnique.mockResolvedValue(
			makeCartItem({ cart: { userId: null, sessionId: "other-sess" } }),
		);

		await removeFromCart(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith("Acces non autorise");
	});

	it("allows access when userId matches", async () => {
		await removeFromCart(undefined, makeFormData());
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("allows access when sessionId matches for guest", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: "sess-1" },
		});
		mockPrisma.cartItem.findUnique.mockResolvedValue(
			makeCartItem({ cart: { userId: null, sessionId: "sess-1" } }),
		);

		await removeFromCart(undefined, makeFormData());
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("deletes item in transaction", async () => {
		const mockDelete = vi.fn();
		const mockCartUpdate = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({ cartItem: { delete: mockDelete }, cart: { update: mockCartUpdate } }),
		);

		await removeFromCart(undefined, makeFormData());
		expect(mockDelete).toHaveBeenCalledWith({ where: { id: "item-1" } });
		expect(mockCartUpdate).toHaveBeenCalled();
	});

	it("invalidates cart cache tags", async () => {
		await removeFromCart(undefined, makeFormData());
		expect(mockGetCartInvalidationTags).toHaveBeenCalledWith("user-1", undefined);
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag-2");
	});

	it("invalidates product FOMO cache tag", async () => {
		await removeFromCart(undefined, makeFormData());
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-product-1");
	});

	it("calls handleActionError on exception", async () => {
		const err = new Error("DB down");
		mockPrisma.cartItem.findUnique.mockRejectedValue(err);

		await removeFromCart(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalledWith(
			err,
			"Impossible de supprimer l'article du panier",
		);
	});
});
