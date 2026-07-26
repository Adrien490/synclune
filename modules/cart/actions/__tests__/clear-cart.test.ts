import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockCheckCartRateLimit,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
} = vi.hoisted(() => ({
	mockCheckCartRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockPrisma: {
		cart: { findFirst: vi.fn() },
		cartItem: { deleteMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { CLEAR: "clear" },
}));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: { PRODUCT_CARTS: (id: string) => `product-carts-${id}` },
}));

import { clearCart } from "../clear-cart";

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockPrisma.cart.findFirst.mockResolvedValue({
		id: "cart-1",
		items: [{ sku: { productId: "p1" } }, { sku: { productId: "p2" } }],
	});
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
		fn({
			cartItem: { deleteMany: vi.fn() },
			cart: { update: vi.fn() },
		}),
	);
	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockSuccess.mockReturnValue({ status: "success", message: "OK" });
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

describe("clearCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns rate limit error state if rate limited", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "rate limited" },
		});
		const result = await clearCart(undefined);
		expect(result).toEqual({ status: "error", message: "rate limited" });
	});

	it("returns error when neither userId nor sessionId", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: null },
		});
		await clearCart(undefined);
		expect(mockError).toHaveBeenCalled();
	});

	it("returns error when cart not found", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(null);
		await clearCart(undefined);
		expect(mockError).toHaveBeenCalled();
	});

	it("returns success noop when cart already empty", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue({ id: "cart-1", items: [] });
		await clearCart(undefined);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("vide"), {
			clearedCount: 0,
		});
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("deletes all items + resets metadata + invalidates cache", async () => {
		const deleteMany = vi.fn();
		const cartUpdate = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({ cartItem: { deleteMany }, cart: { update: cartUpdate } }),
		);

		await clearCart(undefined);

		expect(deleteMany).toHaveBeenCalledWith({ where: { cartId: "cart-1" } });
		expect(cartUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					appliedDiscountCode: null,
					discountAmountCache: null,
				}),
			}),
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-p1");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-p2");
	});

	it("calls handleActionError on exception", async () => {
		mockPrisma.cart.findFirst.mockRejectedValue(new Error("boom"));
		await clearCart(undefined);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
