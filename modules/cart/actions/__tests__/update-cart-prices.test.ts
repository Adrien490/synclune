import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockCheckCartRateLimit,
	mockUpdateTag,
	mockGetCartInvalidationTags,
	mockHandleActionError,
} = vi.hoisted(() => ({
	mockPrisma: {
		cart: { findFirst: vi.fn() },
		cartItem: { update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockCheckCartRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
	mockHandleActionError: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));
vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { UPDATE: "update" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	handleActionError: mockHandleActionError,
}));

import { updateCartPrices } from "../update-cart-prices";

// ============================================================================
// HELPERS
// ============================================================================

function makeCartItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "ci-1",
		priceAtAdd: 4999,
		sku: {
			id: "sku-1",
			priceInclTax: 4999,
			isActive: true,
			deletedAt: null,
			product: {
				status: "PUBLIC",
				deletedAt: null,
			},
		},
		...overrides,
	};
}

function makeCart(items: unknown[] = [makeCartItem()]) {
	return { id: "cart-1", items };
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateCartPrices", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: "user-1", sessionId: null },
		});
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());
		mockPrisma.$transaction.mockResolvedValue([]);
		mockGetCartInvalidationTags.mockReturnValue(["cart-user-1"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns error when rate limit fails", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: ActionStatus.ERROR, message: "Trop de requetes" },
		});

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.cart.findFirst).not.toHaveBeenCalled();
	});

	it("returns error when no userId and no sessionId", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: null, sessionId: null },
		});

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("panier");
	});

	it("returns error when cart is empty", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart([]));

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("vide");
	});

	it("returns error when cart not found", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(null);

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns success with updatedCount=0 when all prices match", async () => {
		// priceAtAdd === sku.priceInclTax
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart([makeCartItem()]));

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ updatedCount: 0 });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("only updates items where price has changed", async () => {
		const items = [
			makeCartItem({ id: "ci-1", priceAtAdd: 4999 }), // same price, skip
			makeCartItem({
				id: "ci-2",
				priceAtAdd: 3999,
				sku: {
					id: "sku-2",
					priceInclTax: 4999,
					isActive: true,
					deletedAt: null,
					product: { status: "PUBLIC", deletedAt: null },
				},
			}), // price changed, update
		];
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart(items));

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ updatedCount: 1 });
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
	});

	it("excludes soft-deleted SKUs from updates", async () => {
		const items = [
			makeCartItem({
				id: "ci-1",
				priceAtAdd: 3999,
				sku: {
					id: "sku-1",
					priceInclTax: 4999,
					isActive: true,
					deletedAt: new Date(), // soft-deleted
					product: { status: "PUBLIC", deletedAt: null },
				},
			}),
		];
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart(items));

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ updatedCount: 0 });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("excludes inactive SKUs from updates", async () => {
		const items = [
			makeCartItem({
				id: "ci-1",
				priceAtAdd: 3999,
				sku: {
					id: "sku-1",
					priceInclTax: 4999,
					isActive: false,
					deletedAt: null,
					product: { status: "PUBLIC", deletedAt: null },
				},
			}),
		];
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart(items));

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ updatedCount: 0 });
	});

	it("excludes non-PUBLIC products from updates", async () => {
		const items = [
			makeCartItem({
				id: "ci-1",
				priceAtAdd: 3999,
				sku: {
					id: "sku-1",
					priceInclTax: 4999,
					isActive: true,
					deletedAt: null,
					product: { status: "DRAFT", deletedAt: null },
				},
			}),
		];
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart(items));

		const result = await updateCartPrices();

		expect(result.data).toEqual({ updatedCount: 0 });
	});

	it("excludes soft-deleted products from updates", async () => {
		const items = [
			makeCartItem({
				id: "ci-1",
				priceAtAdd: 3999,
				sku: {
					id: "sku-1",
					priceInclTax: 4999,
					isActive: true,
					deletedAt: null,
					product: { status: "PUBLIC", deletedAt: new Date() },
				},
			}),
		];
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart(items));

		const result = await updateCartPrices();

		expect(result.data).toEqual({ updatedCount: 0 });
	});

	it("invalidates cart cache tags after update", async () => {
		const items = [
			makeCartItem({
				id: "ci-1",
				priceAtAdd: 3999,
				sku: {
					id: "sku-1",
					priceInclTax: 4999,
					isActive: true,
					deletedAt: null,
					product: { status: "PUBLIC", deletedAt: null },
				},
			}),
		];
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart(items));
		mockGetCartInvalidationTags.mockReturnValue(["cart-user-1", "cart-list"]);

		await updateCartPrices();

		expect(mockUpdateTag).toHaveBeenCalledWith("cart-user-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-list");
	});

	it("uses sessionId when userId is not available", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: null, sessionId: "session-123" },
		});
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		await updateCartPrices();

		const findCall = mockPrisma.cart.findFirst.mock.calls[0]![0];
		expect(findCall.where.sessionId).toBe("session-123");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.cart.findFirst.mockRejectedValue(new Error("DB crash"));

		await updateCartPrices();

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la mise a jour des prix",
		);
	});
});
