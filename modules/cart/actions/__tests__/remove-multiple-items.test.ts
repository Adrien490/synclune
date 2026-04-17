import { describe, it, expect, vi, beforeEach } from "vitest";

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
		cart: { findFirst: vi.fn() },
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
	validateInput: mockValidateInput,
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
vi.mock("../../schemas/cart.schemas", () => ({
	removeMultipleItemsSchema: {},
}));

import { removeMultipleItems } from "../remove-multiple-items";

function makeFormData(ids: string[] = ["ci-1", "ci-2"]) {
	const fd = new FormData();
	fd.set("cartItemIds", JSON.stringify(ids));
	return fd;
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockValidateInput.mockImplementation((_s: unknown, data: { cartItemIds: string[] }) => ({
		data,
	}));
	mockPrisma.cart.findFirst.mockResolvedValue({
		id: "cart-1",
		items: [
			{ id: "ci-1", sku: { productId: "p1" } },
			{ id: "ci-2", sku: { productId: "p2" } },
		],
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

describe("removeMultipleItems", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns rate limit error", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "rate" },
		});
		const result = await removeMultipleItems(undefined, makeFormData());
		expect(result).toEqual({ status: "error", message: "rate" });
	});

	it("filters to items that are owned (IDOR-safe)", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue({
			id: "cart-1",
			items: [{ id: "ci-1", sku: { productId: "p1" } }],
		});
		const deleteMany = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({ cartItem: { deleteMany }, cart: { update: vi.fn() } }),
		);

		await removeMultipleItems(undefined, makeFormData(["ci-1", "ci-foreign"]));

		expect(deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["ci-1"] }, cartId: "cart-1" },
		});
	});

	it("returns error if no owned items match", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue({ id: "cart-1", items: [] });
		await removeMultipleItems(undefined, makeFormData(["ci-foreign"]));
		expect(mockError).toHaveBeenCalled();
	});

	it("invalidates cache for each distinct product", async () => {
		await removeMultipleItems(undefined, makeFormData());
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-p1");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-p2");
	});
});
