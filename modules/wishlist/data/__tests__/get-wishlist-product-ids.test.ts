import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_USER_ID, VALID_PRODUCT_ID, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockGetSession, mockGetWishlistSessionId, mockCacheLife, mockCacheTag } =
	vi.hoisted(() => ({
		mockPrisma: {
			wishlistItem: {
				findMany: vi.fn(),
			},
		},
		mockGetSession: vi.fn(),
		mockGetWishlistSessionId: vi.fn(),
		mockCacheLife: vi.fn(),
		mockCacheTag: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	getWishlistSessionId: mockGetWishlistSessionId,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("@/modules/wishlist/constants/cache", () => ({
	WISHLIST_CACHE_TAGS: {
		PRODUCT_IDS: (userId?: string, sessionId?: string) =>
			userId
				? `wishlist-products-user-${userId}`
				: sessionId
					? `wishlist-products-session-${sessionId}`
					: "wishlist-products-anonymous",
	},
}));

import { getWishlistProductIds } from "../get-wishlist-product-ids";

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SESSION_ID = "session_xyz789";

// ============================================================================
// TESTS
// ============================================================================

describe("getWishlistProductIds", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: unauthenticated, no session
		mockGetSession.mockResolvedValue(null);
		mockGetWishlistSessionId.mockResolvedValue(null);
		mockPrisma.wishlistItem.findMany.mockResolvedValue([{ productId: VALID_PRODUCT_ID }]);
	});

	// No auth + no session → empty Set (short-circuit in fetchWishlistProductIds)
	it("should return empty Set when user is not authenticated and no session", async () => {
		const result = await getWishlistProductIds();

		expect(result).toBeInstanceOf(Set);
		expect(result.size).toBe(0);
		expect(mockPrisma.wishlistItem.findMany).not.toHaveBeenCalled();
	});

	// Authenticated user → queries by userId, returns Set of product IDs
	it("should return Set of product IDs for authenticated user", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([
			{ productId: VALID_PRODUCT_ID },
			{ productId: VALID_CUID },
		]);

		const result = await getWishlistProductIds();

		expect(result).toBeInstanceOf(Set);
		expect(result.size).toBe(2);
		expect(result.has(VALID_PRODUCT_ID)).toBe(true);
		expect(result.has(VALID_CUID)).toBe(true);
		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { userId: VALID_USER_ID },
				}),
			}),
		);
	});

	// Guest session → queries by sessionId, returns Set of product IDs
	it("should return Set of product IDs for guest session", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetWishlistSessionId.mockResolvedValue(VALID_SESSION_ID);
		mockPrisma.wishlistItem.findMany.mockResolvedValue([{ productId: VALID_CUID_2 }]);

		const result = await getWishlistProductIds();

		expect(result).toBeInstanceOf(Set);
		expect(result.size).toBe(1);
		expect(result.has(VALID_CUID_2)).toBe(true);
		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { sessionId: VALID_SESSION_ID },
				}),
			}),
		);
	});

	// Only PUBLIC + notDeleted products are queried
	it("should filter by PUBLIC products and notDeleted", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([]);

		await getWishlistProductIds();

		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					product: expect.objectContaining({
						status: "PUBLIC",
						deletedAt: null,
					}),
				}),
			}),
		);
	});

	// productId: { not: null } is included in the where clause
	it("should exclude items with null productId via where clause", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([]);

		await getWishlistProductIds();

		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					productId: { not: null },
				}),
			}),
		);
	});

	// Filters out null productIds from findMany results (defensive filtering)
	it("should filter out null productIds from findMany results", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		// Simulate items that somehow returned null productId
		mockPrisma.wishlistItem.findMany.mockResolvedValue([
			{ productId: VALID_PRODUCT_ID },
			{ productId: null },
			{ productId: VALID_CUID },
		]);

		const result = await getWishlistProductIds();

		expect(result.size).toBe(2);
		expect(result.has(VALID_PRODUCT_ID)).toBe(true);
		expect(result.has(VALID_CUID)).toBe(true);
		expect(result.has(null as unknown as string)).toBe(false);
	});

	// Authenticated user with no items → empty Set
	it("should return empty Set when authenticated user has no wishlist items", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([]);

		const result = await getWishlistProductIds();

		expect(result).toBeInstanceOf(Set);
		expect(result.size).toBe(0);
	});

	// Authenticated user → session is NOT fetched (getWishlistSessionId not called)
	it("should not call getWishlistSessionId when user is authenticated", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });

		await getWishlistProductIds();

		expect(mockGetWishlistSessionId).not.toHaveBeenCalled();
	});

	// Error resilience: exception during DB call returns empty Set
	it("should return empty Set on exception", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.findMany.mockRejectedValue(new Error("DB connection lost"));

		const result = await getWishlistProductIds();

		expect(result).toBeInstanceOf(Set);
		expect(result.size).toBe(0);
	});

	// Returns a proper Set (O(1) lookup works)
	it("should return a proper Set allowing O(1) lookups", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([{ productId: VALID_PRODUCT_ID }]);

		const result = await getWishlistProductIds();

		expect(result.has(VALID_PRODUCT_ID)).toBe(true);
		expect(result.has("non-existent-id")).toBe(false);
	});
});
