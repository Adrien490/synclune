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
		cart: { findFirst: vi.fn(), update: vi.fn() },
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { DISCOUNT: "discount" },
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
}));

import { removeCartDiscount } from "../remove-cart-discount";

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockPrisma.cart.findFirst.mockResolvedValue({
		id: "cart-1",
		appliedDiscountCode: "SUMMER20",
	});
	mockPrisma.cart.update.mockResolvedValue({});
	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockSuccess.mockReturnValue({ status: "success", message: "OK" });
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

describe("removeCartDiscount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns rate limit error", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "rate" },
		});
		const result = await removeCartDiscount(undefined);
		expect(result).toEqual({ status: "error", message: "rate" });
	});

	it("returns error when no cart", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(null);
		await removeCartDiscount(undefined);
		expect(mockError).toHaveBeenCalled();
	});

	it("returns error when no discount applied", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue({ id: "cart-1", appliedDiscountCode: null });
		await removeCartDiscount(undefined);
		expect(mockError).toHaveBeenCalled();
	});

	it("clears discount fields and invalidates cache", async () => {
		await removeCartDiscount(undefined);
		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cart-1" },
				data: expect.objectContaining({
					appliedDiscountCode: null,
					discountAmountCache: null,
				}),
			}),
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
	});
});
