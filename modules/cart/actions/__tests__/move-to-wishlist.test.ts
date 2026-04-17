import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockCheckCartRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockForbidden,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
	mockGetWishlistInvalidationTags,
} = vi.hoisted(() => ({
	mockCheckCartRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockForbidden: vi.fn(),
	mockPrisma: {
		cartItem: { findUnique: vi.fn() },
		$transaction: vi.fn(),
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
	mockGetWishlistInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { REMOVE: "remove" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (fd: FormData, k: string) => fd.get(k)?.toString() ?? null,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	forbidden: mockForbidden,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: { PRODUCT_CARTS: (id: string) => `product-carts-${id}` },
}));
vi.mock("@/modules/wishlist/constants/cache", () => ({
	getWishlistInvalidationTags: mockGetWishlistInvalidationTags,
}));
vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	getWishlistExpirationDate: () => new Date(Date.now() + 86400 * 1000),
}));
vi.mock("@/modules/wishlist/constants/wishlist.constants", () => ({
	WISHLIST_MAX_ITEMS: 500,
}));
vi.mock("@/modules/wishlist/constants/error-messages", () => ({
	WISHLIST_ERROR_MESSAGES: { WISHLIST_FULL: "Wishlist pleine" },
	WISHLIST_FULL_SENTINEL: "WISHLIST_FULL",
}));
vi.mock("../../schemas/cart.schemas", () => ({
	moveToWishlistSchema: {},
}));

import { moveToWishlist } from "../move-to-wishlist";

function makeFormData() {
	const fd = new FormData();
	fd.set("cartItemId", "ci-1");
	return fd;
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockValidateInput.mockReturnValue({ data: { cartItemId: "ci-1" } });
	mockPrisma.cartItem.findUnique.mockResolvedValue({
		id: "ci-1",
		cartId: "cart-1",
		cart: { userId: "user-1", sessionId: null },
		sku: { productId: "prod-1", product: { status: "PUBLIC" } },
	});
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
		fn({
			wishlist: { upsert: vi.fn().mockResolvedValue({ id: "w1" }) },
			wishlistItem: {
				findFirst: vi.fn().mockResolvedValue(null),
				count: vi.fn().mockResolvedValue(0),
				create: vi.fn(),
			},
			cartItem: { delete: vi.fn() },
			cart: { update: vi.fn() },
		}),
	);
	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockGetWishlistInvalidationTags.mockReturnValue(["wishlist-tag"]);
	mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
		status: "success",
		message: msg,
		data,
	}));
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockForbidden.mockReturnValue({ status: "forbidden", message: "forbidden" });
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

describe("moveToWishlist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns forbidden when cart item not found (IDOR-safe)", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);
		await moveToWishlist(undefined, makeFormData());
		expect(mockForbidden).toHaveBeenCalled();
	});

	it("returns forbidden on owner mismatch", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue({
			id: "ci-1",
			cartId: "cart-1",
			cart: { userId: "other-user", sessionId: null },
			sku: { productId: "prod-1", product: { status: "PUBLIC" } },
		});
		await moveToWishlist(undefined, makeFormData());
		expect(mockForbidden).toHaveBeenCalled();
	});

	it("returns error when product not PUBLIC", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue({
			id: "ci-1",
			cartId: "cart-1",
			cart: { userId: "user-1", sessionId: null },
			sku: { productId: "prod-1", product: { status: "DRAFT" } },
		});
		await moveToWishlist(undefined, makeFormData());
		expect(mockError).toHaveBeenCalled();
	});

	it("moves item atomically + invalidates both cart and wishlist caches", async () => {
		const deleteCartItem = vi.fn();
		const createWishlistItem = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				wishlist: { upsert: vi.fn().mockResolvedValue({ id: "w1" }) },
				wishlistItem: {
					findFirst: vi.fn().mockResolvedValue(null),
					count: vi.fn().mockResolvedValue(0),
					create: createWishlistItem,
				},
				cartItem: { delete: deleteCartItem },
				cart: { update: vi.fn() },
			}),
		);

		await moveToWishlist(undefined, makeFormData());

		expect(createWishlistItem).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ productId: "prod-1" }),
			}),
		);
		expect(deleteCartItem).toHaveBeenCalledWith({ where: { id: "ci-1" } });
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
		expect(mockUpdateTag).toHaveBeenCalledWith("wishlist-tag");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-prod-1");
	});

	it("idempotent when product already in wishlist", async () => {
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				wishlist: { upsert: vi.fn().mockResolvedValue({ id: "w1" }) },
				wishlistItem: {
					findFirst: vi.fn().mockResolvedValue({ id: "wi-1" }),
					count: vi.fn(),
					create: vi.fn(),
				},
				cartItem: { delete: vi.fn() },
				cart: { update: vi.fn() },
			}),
		);
		await moveToWishlist(undefined, makeFormData());
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("déjà"), expect.any(Object));
	});
});
