import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockAggregate, mockGetSession, mockGetCartSessionId, mockCacheLife, mockCacheTag } =
	vi.hoisted(() => ({
		mockAggregate: vi.fn(),
		mockGetSession: vi.fn(),
		mockGetCartSessionId: vi.fn(),
		mockCacheLife: vi.fn(),
		mockCacheTag: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		cartItem: { aggregate: mockAggregate },
	},
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getCartSessionId: mockGetCartSessionId,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	CART_CACHE_TAGS: {
		COUNT: (userId?: string, sessionId?: string) =>
			userId
				? `cart-count-user-${userId}`
				: sessionId
					? `cart-count-session-${sessionId}`
					: "cart-count-anonymous",
	},
}));

import { getCartItemCount, fetchCartItemCount } from "../get-cart-item-count";

// ============================================================================
// Tests: getCartItemCount
// ============================================================================

describe("getCartItemCount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSession.mockResolvedValue(null);
		mockGetCartSessionId.mockResolvedValue(null);
		mockAggregate.mockResolvedValue({ _sum: { quantity: null } });
	});

	it("uses userId for authenticated user", async () => {
		// Arrange
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockAggregate.mockResolvedValue({ _sum: { quantity: 3 } });

		// Act
		await getCartItemCount();

		// Assert
		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					cart: expect.objectContaining({ userId: "user-1" }),
				}),
			}),
		);
	});

	it("uses sessionId for guest user", async () => {
		// Arrange
		mockGetSession.mockResolvedValue(null);
		mockGetCartSessionId.mockResolvedValue("session-abc");
		mockAggregate.mockResolvedValue({ _sum: { quantity: 2 } });

		// Act
		await getCartItemCount();

		// Assert
		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					cart: expect.objectContaining({ sessionId: "session-abc" }),
				}),
			}),
		);
	});

	it("does not fetch sessionId when user is authenticated", async () => {
		// Arrange
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockAggregate.mockResolvedValue({ _sum: { quantity: 1 } });

		// Act
		await getCartItemCount();

		// Assert
		expect(mockGetCartSessionId).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: fetchCartItemCount
// ============================================================================

describe("fetchCartItemCount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAggregate.mockResolvedValue({ _sum: { quantity: null } });
	});

	it("returns 0 when no identifiers provided", async () => {
		// Act
		const result = await fetchCartItemCount(undefined, undefined);

		// Assert
		expect(result).toBe(0);
		expect(mockAggregate).not.toHaveBeenCalled();
	});

	it("returns aggregate sum for authenticated user", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 5 } });

		// Act
		const result = await fetchCartItemCount("user-1", undefined);

		// Assert
		expect(result).toBe(5);
	});

	it("returns aggregate sum for guest user", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 3 } });

		// Act
		const result = await fetchCartItemCount(undefined, "session-xyz");

		// Assert
		expect(result).toBe(3);
	});

	it("returns 0 when aggregate sum is null", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: null } });

		// Act
		const result = await fetchCartItemCount("user-1", undefined);

		// Assert
		expect(result).toBe(0);
	});

	it("uses cart cache profile", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 2 } });

		// Act
		await fetchCartItemCount("user-1", undefined);

		// Assert
		expect(mockCacheLife).toHaveBeenCalledWith("cart");
	});

	it("uses COUNT cache tag with user-specific tag when userId provided", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 1 } });

		// Act
		await fetchCartItemCount("user-42", undefined);

		// Assert
		expect(mockCacheTag).toHaveBeenCalledWith("cart-count-user-user-42");
	});

	it("uses COUNT cache tag with session-specific tag when sessionId provided", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 1 } });

		// Act
		await fetchCartItemCount(undefined, "session-abc");

		// Assert
		expect(mockCacheTag).toHaveBeenCalledWith("cart-count-session-session-abc");
	});

	it("excludes expired carts via OR clause on expiresAt", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 4 } });

		// Act
		await fetchCartItemCount("user-1", undefined);

		// Assert
		const callArg = mockAggregate.mock.calls[0]![0];
		expect(callArg.where.cart.OR).toBeDefined();
		expect(callArg.where.cart.OR).toContainEqual({ expiresAt: null });
		expect(callArg.where.cart.OR).toContainEqual({ expiresAt: { gt: expect.any(Date) } });
	});

	it("queries by userId when userId is provided", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 2 } });

		// Act
		await fetchCartItemCount("user-99", undefined);

		// Assert
		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					cart: expect.objectContaining({ userId: "user-99" }),
				}),
			}),
		);
	});

	it("queries by sessionId when no userId is provided", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 2 } });

		// Act
		await fetchCartItemCount(undefined, "session-99");

		// Assert
		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					cart: expect.objectContaining({ sessionId: "session-99" }),
				}),
			}),
		);
	});

	it("aggregates the quantity field with _sum", async () => {
		// Arrange
		mockAggregate.mockResolvedValue({ _sum: { quantity: 7 } });

		// Act
		await fetchCartItemCount("user-1", undefined);

		// Assert
		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				_sum: { quantity: true },
			}),
		);
	});
});
