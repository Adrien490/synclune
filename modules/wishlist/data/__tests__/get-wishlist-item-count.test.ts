import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockGetSession, mockGetWishlistSessionId, mockCacheLife, mockCacheTag } =
	vi.hoisted(() => ({
		mockPrisma: {
			wishlistItem: {
				count: vi.fn(),
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

vi.mock("../constants/cache", () => ({
	WISHLIST_CACHE_TAGS: {
		COUNT: (userId?: string, sessionId?: string) =>
			userId
				? `wishlist-count-user-${userId}`
				: sessionId
					? `wishlist-count-session-${sessionId}`
					: "wishlist-count-anonymous",
	},
}));

import { fetchWishlistItemCount } from "../get-wishlist-item-count";

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SESSION_ID = "session_abc123";

// ============================================================================
// TESTS
// ============================================================================

describe("fetchWishlistItemCount", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockPrisma.wishlistItem.count.mockResolvedValue(3);
	});

	// No userId and no sessionId → returns 0 immediately
	it("should return 0 when no userId and no sessionId", async () => {
		const result = await fetchWishlistItemCount(undefined, undefined);

		expect(result).toBe(0);
		expect(mockPrisma.wishlistItem.count).not.toHaveBeenCalled();
	});

	// Authenticated user → queries by userId
	it("should return count for authenticated user", async () => {
		mockPrisma.wishlistItem.count.mockResolvedValue(5);

		const result = await fetchWishlistItemCount(VALID_USER_ID, undefined);

		expect(result).toBe(5);
		expect(mockPrisma.wishlistItem.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { userId: VALID_USER_ID },
				}),
			}),
		);
	});

	// Guest session → queries by sessionId
	it("should return count for guest session", async () => {
		mockPrisma.wishlistItem.count.mockResolvedValue(2);

		const result = await fetchWishlistItemCount(undefined, VALID_SESSION_ID);

		expect(result).toBe(2);
		expect(mockPrisma.wishlistItem.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { sessionId: VALID_SESSION_ID },
				}),
			}),
		);
	});

	// Filters by PUBLIC products and notDeleted
	it("should filter by PUBLIC products and notDeleted", async () => {
		await fetchWishlistItemCount(VALID_USER_ID, undefined);

		expect(mockPrisma.wishlistItem.count).toHaveBeenCalledWith(
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

	// userId takes priority: when both are given, uses userId
	it("should query by userId when both userId and sessionId are provided", async () => {
		await fetchWishlistItemCount(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.wishlistItem.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { userId: VALID_USER_ID },
				}),
			}),
		);
	});

	// Returns 0 when count is 0
	it("should return 0 when wishlist is empty", async () => {
		mockPrisma.wishlistItem.count.mockResolvedValue(0);

		const result = await fetchWishlistItemCount(VALID_USER_ID, undefined);

		expect(result).toBe(0);
	});

	// Error resilience: exception during DB call returns 0
	it("should return 0 on exception", async () => {
		mockPrisma.wishlistItem.count.mockRejectedValue(new Error("DB timeout"));

		const result = await fetchWishlistItemCount(VALID_USER_ID, undefined);

		expect(result).toBe(0);
	});

	// cache configuration: uses "cart" profile and correct tag
	it("should configure cache with cart profile and COUNT tag", async () => {
		await fetchWishlistItemCount(VALID_USER_ID, undefined);

		expect(mockCacheLife).toHaveBeenCalledWith("cart");
		expect(mockCacheTag).toHaveBeenCalledWith(`wishlist-count-user-${VALID_USER_ID}`);
	});

	it("should use session COUNT tag for guest", async () => {
		await fetchWishlistItemCount(undefined, VALID_SESSION_ID);

		expect(mockCacheTag).toHaveBeenCalledWith(`wishlist-count-session-${VALID_SESSION_ID}`);
	});
});
