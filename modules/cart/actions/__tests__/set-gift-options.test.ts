import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockCheckCartRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockForbidden,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
} = vi.hoisted(() => ({
	mockCheckCartRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockForbidden: vi.fn(),
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
	CART_LIMITS: { METADATA: "metadata" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (fd: FormData, k: string) => fd.get(k)?.toString() ?? null,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	forbidden: mockForbidden,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));
vi.mock("../../schemas/cart.schemas", () => ({
	setGiftOptionsSchema: {},
}));

import { setGiftOptions } from "../set-gift-options";

function makeFormData(wrap = true, msg = "Joyeux anniversaire") {
	const fd = new FormData();
	fd.set("cartItemId", "ci-1");
	fd.set("giftWrap", String(wrap));
	fd.set("giftMessage", msg);
	return fd;
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockValidateInput.mockReturnValue({
		data: { cartItemId: "ci-1", giftWrap: true, giftMessage: "Joyeux anniversaire" },
	});
	mockPrisma.cartItem.findUnique.mockResolvedValue({
		id: "ci-1",
		cartId: "cart-1",
		cart: { userId: "user-1", sessionId: null },
	});
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
		fn({ cartItem: { update: vi.fn() }, cart: { update: vi.fn() } }),
	);
	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockSuccess.mockReturnValue({ status: "success", message: "OK" });
	mockForbidden.mockReturnValue({ status: "forbidden", message: "forbidden" });
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

describe("setGiftOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns forbidden if cart item not found", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);
		await setGiftOptions(undefined, makeFormData());
		expect(mockForbidden).toHaveBeenCalled();
	});

	it("returns forbidden if owner mismatch", async () => {
		mockPrisma.cartItem.findUnique.mockResolvedValue({
			id: "ci-1",
			cartId: "cart-1",
			cart: { userId: "other-user", sessionId: null },
		});
		await setGiftOptions(undefined, makeFormData());
		expect(mockForbidden).toHaveBeenCalled();
	});

	it("persists gift options and invalidates cache", async () => {
		const itemUpdate = vi.fn();
		const cartUpdate = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({ cartItem: { update: itemUpdate }, cart: { update: cartUpdate } }),
		);

		await setGiftOptions(undefined, makeFormData());

		expect(itemUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "ci-1" },
				data: expect.objectContaining({
					giftWrap: true,
					giftMessage: "Joyeux anniversaire",
				}),
			}),
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
	});
});
