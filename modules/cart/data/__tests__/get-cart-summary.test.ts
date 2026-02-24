import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockFindFirst,
	mockGetSession,
	mockGetCartSessionId,
	mockCacheCartSummary,
} = vi.hoisted(() => ({
	mockFindFirst: vi.fn(),
	mockGetSession: vi.fn(),
	mockGetCartSessionId: vi.fn(),
	mockCacheCartSummary: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		cart: { findFirst: mockFindFirst },
	},
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getCartSessionId: mockGetCartSessionId,
}));

vi.mock("../../constants/cache", () => ({
	cacheCartSummary: mockCacheCartSummary,
}));

vi.mock("../../constants/cart", () => ({
	GET_CART_SUMMARY_SELECT: { items: true },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

import { getCartSummary, fetchCartSummary } from "../get-cart-summary";

// ============================================================================
// Factories
// ============================================================================

const EMPTY_SUMMARY = { itemCount: 0, totalAmount: 0, hasItems: false };

function makeCartItem(quantity: number, priceAtAdd: number) {
	return { quantity, priceAtAdd };
}

function makeCart(items: { quantity: number; priceAtAdd: number }[]) {
	return { items };
}

// ============================================================================
// Tests: getCartSummary
// ============================================================================

describe("getCartSummary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSession.mockResolvedValue(null);
		mockGetCartSessionId.mockResolvedValue("session-abc");
		mockFindFirst.mockResolvedValue(null);
	});

	it("uses userId for authenticated user", async () => {
		// Arrange
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockFindFirst.mockResolvedValue(makeCart([makeCartItem(2, 1500)]));

		// Act
		await getCartSummary();

		// Assert
		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
		);
	});

	it("uses sessionId for guest user", async () => {
		// Arrange
		mockGetSession.mockResolvedValue(null);
		mockGetCartSessionId.mockResolvedValue("session-xyz");
		mockFindFirst.mockResolvedValue(makeCart([makeCartItem(1, 999)]));

		// Act
		await getCartSummary();

		// Assert
		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ sessionId: "session-xyz" }) })
		);
	});

	it("does not fetch sessionId when user is authenticated", async () => {
		// Arrange
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockFindFirst.mockResolvedValue(null);

		// Act
		await getCartSummary();

		// Assert
		expect(mockGetCartSessionId).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: fetchCartSummary
// ============================================================================

describe("fetchCartSummary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindFirst.mockResolvedValue(null);
	});

	it("returns empty summary when no identifiers provided", async () => {
		// Act
		const result = await fetchCartSummary(undefined, undefined);

		// Assert
		expect(result).toEqual(EMPTY_SUMMARY);
		expect(mockFindFirst).not.toHaveBeenCalled();
	});

	it("returns empty summary when cart not found", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(null);

		// Act
		const result = await fetchCartSummary("user-1", undefined);

		// Assert
		expect(result).toEqual(EMPTY_SUMMARY);
	});

	it("returns empty summary when cart has no items", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(makeCart([]));

		// Act
		const result = await fetchCartSummary("user-1", undefined);

		// Assert
		expect(result).toEqual(EMPTY_SUMMARY);
	});

	it("calculates itemCount as sum of all item quantities", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(
			makeCart([makeCartItem(2, 1000), makeCartItem(3, 500), makeCartItem(1, 2000)])
		);

		// Act
		const result = await fetchCartSummary("user-1", undefined);

		// Assert
		expect(result.itemCount).toBe(6);
	});

	it("calculates totalAmount as sum of price multiplied by quantity for each item", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(
			makeCart([makeCartItem(2, 1000), makeCartItem(3, 500)])
		);

		// Act
		const result = await fetchCartSummary("user-1", undefined);

		// Assert
		// (2 * 1000) + (3 * 500) = 2000 + 1500 = 3500
		expect(result.totalAmount).toBe(3500);
	});

	it("sets hasItems to true when cart has items", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(makeCart([makeCartItem(1, 999)]));

		// Act
		const result = await fetchCartSummary("user-1", undefined);

		// Assert
		expect(result.hasItems).toBe(true);
	});

	it("sets hasItems to false when cart is empty", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(makeCart([]));

		// Act
		const result = await fetchCartSummary("user-1", undefined);

		// Assert
		expect(result.hasItems).toBe(false);
	});

	it("returns empty summary on DB error", async () => {
		// Arrange
		mockFindFirst.mockRejectedValue(new Error("Connection refused"));

		// Act
		const result = await fetchCartSummary("user-1", undefined);

		// Assert
		expect(result).toEqual(EMPTY_SUMMARY);
	});

	it("queries by userId when userId is provided", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(makeCart([makeCartItem(1, 500)]));

		// Act
		await fetchCartSummary("user-1", undefined);

		// Assert
		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
		);
	});

	it("queries by sessionId when no userId is provided", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(makeCart([makeCartItem(1, 500)]));

		// Act
		await fetchCartSummary(undefined, "session-xyz");

		// Assert
		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ sessionId: "session-xyz" }) })
		);
	});

	it("excludes expired carts via OR clause on expiresAt", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(null);

		// Act
		await fetchCartSummary("user-1", undefined);

		// Assert
		const callArg = mockFindFirst.mock.calls[0][0];
		expect(callArg.where.OR).toBeDefined();
		expect(callArg.where.OR).toContainEqual({ expiresAt: null });
		expect(callArg.where.OR).toContainEqual({ expiresAt: { gt: expect.any(Date) } });
	});

	it("calls cacheCartSummary with userId and sessionId", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(null);

		// Act
		await fetchCartSummary("user-42", "session-abc");

		// Assert
		expect(mockCacheCartSummary).toHaveBeenCalledWith("user-42", "session-abc");
	});

	it("correctly sums a single item cart", async () => {
		// Arrange
		mockFindFirst.mockResolvedValue(makeCart([makeCartItem(5, 2000)]));

		// Act
		const result = await fetchCartSummary("user-1", undefined);

		// Assert
		expect(result.itemCount).toBe(5);
		expect(result.totalAmount).toBe(10000);
		expect(result.hasItems).toBe(true);
	});
});
