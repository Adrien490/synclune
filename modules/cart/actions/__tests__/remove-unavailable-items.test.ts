import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockCheckCartRateLimit,
	mockFilterUnavailableItems,
	mockHandleActionError,
	mockUpdateTag,
	mockGetCartInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		cart: { findFirst: vi.fn(), update: vi.fn() },
		cartItem: { deleteMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockCheckCartRateLimit: vi.fn(),
	mockFilterUnavailableItems: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { REMOVE: "cart-remove" },
}));

vi.mock("@/modules/cart/services/item-availability.service", () => ({
	filterUnavailableItems: mockFilterUnavailableItems,
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	handleActionError: mockHandleActionError,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: {
		PRODUCT_CARTS: (productId: string) => `product-carts-${productId}`,
	},
}));

import { removeUnavailableItems } from "../remove-unavailable-items";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_USER_ID = "user_cm1234567890abcdef";
const VALID_CART_ID = "cart_cm1234567890abcde";
const VALID_SKU_ID = "sku_cm1234567890abcdefg";
const VALID_PRODUCT_ID = "prod_cm1234567890abcde";

function createMockCartItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "item_cm1234567890abcde",
		skuId: VALID_SKU_ID,
		quantity: 1,
		sku: {
			id: VALID_SKU_ID,
			inventory: 10,
			isActive: true,
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

function makeSuccessRateLimit(userId = VALID_USER_ID, sessionId: string | null = null) {
	return {
		success: true,
		context: { userId, sessionId },
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("removeUnavailableItems", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockCheckCartRateLimit.mockResolvedValue(makeSuccessRateLimit());
		mockPrisma.cart.findFirst.mockResolvedValue(createMockCart());
		mockFilterUnavailableItems.mockReturnValue([]);
		mockGetCartInvalidationTags.mockReturnValue([
			`cart-user-${VALID_USER_ID}`,
			`cart-count-user-${VALID_USER_ID}`,
			`cart-summary-user-${VALID_USER_ID}`,
		]);
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));

		mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.cart.update.mockResolvedValue({});
	});

	it("should return error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: rateLimitError,
		});

		const result = await removeUnavailableItems();

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.cart.findFirst).not.toHaveBeenCalled();
	});

	it("should return error when neither userId nor sessionId is available", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: null },
		});

		const result = await removeUnavailableItems();

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Aucun panier trouvé");
	});

	it("should return success with deletedCount=0 when cart is not found", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(null);

		const result = await removeUnavailableItems();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Aucun article à retirer");
		expect(result.data).toEqual({ deletedCount: 0 });
	});

	it("should return success with deletedCount=0 when cart is empty", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(createMockCart([]));

		const result = await removeUnavailableItems();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Aucun article à retirer");
		expect(result.data).toEqual({ deletedCount: 0 });
	});

	it("should return success when no unavailable items are found", async () => {
		mockFilterUnavailableItems.mockReturnValue([]);

		const result = await removeUnavailableItems();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Aucun article indisponible");
		expect(result.data).toEqual({ deletedCount: 0 });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should delete unavailable items and return correct count", async () => {
		const unavailableItem = createMockCartItem({ id: "item-bad" });
		mockFilterUnavailableItems.mockReturnValue([unavailableItem]);
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));

		const result = await removeUnavailableItems();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ deletedCount: 1 });
		expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
			where: { cartId: "cart_cm1234567890abcde", id: { in: ["item-bad"] } },
		});
	});

	it("should pluralize the success message for multiple removed items", async () => {
		const unavailableItems = [
			createMockCartItem({ id: "item-1" }),
			createMockCartItem({ id: "item-2" }),
		];
		mockPrisma.cart.findFirst.mockResolvedValue(createMockCart(unavailableItems));
		mockFilterUnavailableItems.mockReturnValue(unavailableItems);
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));

		const result = await removeUnavailableItems();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2");
		expect(result.message).toContain("articles");
		expect(result.message).toContain("indisponibles");
	});

	it("should use singular form for exactly one removed item", async () => {
		const unavailableItem = createMockCartItem({ id: "item-bad" });
		mockFilterUnavailableItems.mockReturnValue([unavailableItem]);
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));

		const result = await removeUnavailableItems();

		expect(result.message).toBe("1 article indisponible retiré");
	});

	it("should invalidate cart cache tags after deletion", async () => {
		const unavailableItem = createMockCartItem();
		mockFilterUnavailableItems.mockReturnValue([unavailableItem]);
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));

		await removeUnavailableItems();

		expect(mockGetCartInvalidationTags).toHaveBeenCalledWith(VALID_USER_ID, undefined);
		expect(mockUpdateTag).toHaveBeenCalledWith(`cart-user-${VALID_USER_ID}`);
		expect(mockUpdateTag).toHaveBeenCalledWith(`cart-count-user-${VALID_USER_ID}`);
		expect(mockUpdateTag).toHaveBeenCalledWith(`cart-summary-user-${VALID_USER_ID}`);
	});

	it("should invalidate product FOMO cache tags for each removed item's product", async () => {
		const unavailableItem1 = createMockCartItem({
			id: "item-1",
			sku: {
				id: "sku-1",
				inventory: 0,
				isActive: true,
				deletedAt: null,
				product: { id: "prod-1", title: "P1", status: "PUBLIC", deletedAt: null },
			},
		});
		const unavailableItem2 = createMockCartItem({
			id: "item-2",
			sku: {
				id: "sku-2",
				inventory: 0,
				isActive: true,
				deletedAt: null,
				product: { id: "prod-2", title: "P2", status: "PUBLIC", deletedAt: null },
			},
		});
		mockPrisma.cart.findFirst.mockResolvedValue(
			createMockCart([unavailableItem1, unavailableItem2]),
		);
		mockFilterUnavailableItems.mockReturnValue([unavailableItem1, unavailableItem2]);
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));

		await removeUnavailableItems();

		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-prod-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-prod-2");
	});

	it("should deduplicate product cache tags when multiple items share the same product", async () => {
		const product = { id: "prod-shared", title: "Shared", status: "PUBLIC", deletedAt: null };
		const item1 = createMockCartItem({
			id: "item-1",
			sku: { id: "sku-1", inventory: 0, isActive: true, deletedAt: null, product },
		});
		const item2 = createMockCartItem({
			id: "item-2",
			sku: { id: "sku-2", inventory: 0, isActive: true, deletedAt: null, product },
		});
		mockPrisma.cart.findFirst.mockResolvedValue(createMockCart([item1, item2]));
		mockFilterUnavailableItems.mockReturnValue([item1, item2]);
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));

		await removeUnavailableItems();

		const productCacheCalls = vi
			.mocked(mockUpdateTag)
			.mock.calls.filter(([tag]) => tag === "product-carts-prod-shared");
		expect(productCacheCalls).toHaveLength(1);
	});

	it("should work with sessionId when user is not logged in", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: "sess-abc123" },
		});
		mockPrisma.cart.findFirst.mockResolvedValue(createMockCart([]));

		const result = await removeUnavailableItems();

		expect(mockPrisma.cart.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { sessionId: "sess-abc123" } }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected DB failure", async () => {
		const unavailableItem = createMockCartItem();
		mockFilterUnavailableItems.mockReturnValue([unavailableItem]);
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await removeUnavailableItems();

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la suppression des articles indisponibles",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
