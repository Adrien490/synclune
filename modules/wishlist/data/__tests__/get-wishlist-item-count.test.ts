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

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../constants/cache", () => ({
	cacheWishlistCount: vi.fn(),
	WISHLIST_CACHE_TAGS: {
		COUNT: (userId?: string, sessionId?: string) =>
			userId
				? `wishlist-count-user-${userId}`
				: sessionId
					? `wishlist-count-session-${sessionId}`
					: "wishlist-count-anonymous",
	},
}));

import { getWishlistItemCount } from "../get-wishlist-item-count";

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SESSION_ID = "session_abc123";

// ============================================================================
// TESTS
// ============================================================================

describe("getWishlistItemCount", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockPrisma.wishlistItem.count.mockResolvedValue(3);
		mockGetSession.mockResolvedValue(null);
		mockGetWishlistSessionId.mockResolvedValue(null);
	});

	// No userId and no sessionId → returns 0 immediately
	it("should return 0 when neither session nor wishlist cookie present", async () => {
		const result = await getWishlistItemCount();

		expect(result).toBe(0);
		expect(mockPrisma.wishlistItem.count).not.toHaveBeenCalled();
	});

	// Authenticated user → queries by userId
	it("should return count for authenticated user", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.count.mockResolvedValue(5);

		const result = await getWishlistItemCount();

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
		mockGetWishlistSessionId.mockResolvedValue(VALID_SESSION_ID);
		mockPrisma.wishlistItem.count.mockResolvedValue(2);

		const result = await getWishlistItemCount();

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
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });

		await getWishlistItemCount();

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

	// userId takes priority over guest cookie: wrapper ignores cookie when authenticated
	it("should ignore guest cookie when user is authenticated", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockGetWishlistSessionId.mockResolvedValue(VALID_SESSION_ID);

		await getWishlistItemCount();

		expect(mockPrisma.wishlistItem.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { userId: VALID_USER_ID },
				}),
			}),
		);
		// Guest cookie lookup is skipped entirely when user is authenticated
		expect(mockGetWishlistSessionId).not.toHaveBeenCalled();
	});

	// Returns 0 when count is 0
	it("should return 0 when wishlist is empty", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.count.mockResolvedValue(0);

		const result = await getWishlistItemCount();

		expect(result).toBe(0);
	});

	// Error resilience: exception during DB call returns 0
	it("should return 0 on exception", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.wishlistItem.count.mockRejectedValue(new Error("DB timeout"));

		const result = await getWishlistItemCount();

		expect(result).toBe(0);
	});

	// Session error falls back to anonymous gracefully (no throw, count returns 0)
	it("should fall back to anonymous when getSession throws", async () => {
		mockGetSession.mockRejectedValue(new Error("Session corrupted"));

		const result = await getWishlistItemCount();

		expect(result).toBe(0);
	});

	// cache configuration: uses "checkout" profile and correct tag
	it("should configure cache with checkout profile and COUNT tag", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });

		await getWishlistItemCount();

		expect(mockCacheLife).toHaveBeenCalledWith("checkout");
		expect(mockCacheTag).toHaveBeenCalledWith(`wishlist-count-user-${VALID_USER_ID}`);
	});

	it("should use session COUNT tag for guest", async () => {
		mockGetWishlistSessionId.mockResolvedValue(VALID_SESSION_ID);

		await getWishlistItemCount();

		expect(mockCacheTag).toHaveBeenCalledWith(`wishlist-count-session-${VALID_SESSION_ID}`);
	});
});
