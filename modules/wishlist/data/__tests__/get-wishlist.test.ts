import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_USER_ID, VALID_PRODUCT_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockCacheWishlist,
	mockGetSession,
	mockGetWishlistSessionId,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		wishlistItem: {
			count: vi.fn(),
			findMany: vi.fn(),
		},
	},
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockCacheWishlist: vi.fn(),
	mockGetSession: vi.fn(),
	mockGetWishlistSessionId: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/modules/wishlist/constants/cache", () => ({
	cacheWishlist: mockCacheWishlist,
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

vi.mock("../constants/wishlist.constants", () => ({
	GET_WISHLIST_SELECT: {
		items: {
			orderBy: { createdAt: "desc" },
		},
	},
	GET_WISHLIST_ITEM_SELECT: { id: true, productId: true, createdAt: true },
	GET_WISHLIST_DEFAULT_PER_PAGE: 20,
	GET_WISHLIST_MAX_RESULTS_PER_PAGE: 200,
}));

import { fetchWishlist } from "../get-wishlist";

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SESSION_ID = "session_abc123";

const EMPTY_PAGINATION = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

const EMPTY_RESULT = {
	items: [],
	pagination: EMPTY_PAGINATION,
	totalCount: 0,
};

// ============================================================================
// HELPERS
// ============================================================================

function createMockWishlistItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "item_001",
		productId: VALID_PRODUCT_ID,
		createdAt: new Date("2026-01-15"),
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchWishlist", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockBuildCursorPagination.mockReturnValue({ take: 20, skip: 0 });
		mockProcessCursorResults.mockReturnValue({
			items: [createMockWishlistItem()],
			pagination: EMPTY_PAGINATION,
		});
		mockPrisma.wishlistItem.count.mockResolvedValue(1);
		mockPrisma.wishlistItem.findMany.mockResolvedValue([createMockWishlistItem()]);
	});

	// No userId and no sessionId → immediate empty return
	it("should return empty result when no userId and no sessionId", async () => {
		const result = await fetchWishlist(undefined, undefined);

		expect(result).toEqual(EMPTY_RESULT);
		expect(mockPrisma.wishlistItem.count).not.toHaveBeenCalled();
		expect(mockPrisma.wishlistItem.findMany).not.toHaveBeenCalled();
	});

	// userId takes priority over sessionId
	it("should query by userId when userId is provided", async () => {
		await fetchWishlist(VALID_USER_ID, undefined);

		expect(mockPrisma.wishlistItem.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { userId: VALID_USER_ID },
				}),
			}),
		);
		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { userId: VALID_USER_ID },
				}),
			}),
		);
	});

	// sessionId used when no userId
	it("should query by sessionId when userId is not provided", async () => {
		await fetchWishlist(undefined, VALID_SESSION_ID);

		expect(mockPrisma.wishlistItem.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { sessionId: VALID_SESSION_ID },
				}),
			}),
		);
		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					wishlist: { sessionId: VALID_SESSION_ID },
				}),
			}),
		);
	});

	// Product filter: PUBLIC + notDeleted
	it("should filter products by status PUBLIC and notDeleted", async () => {
		await fetchWishlist(VALID_USER_ID, undefined);

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

	// totalCount 0 → early empty return (skips processCursorResults)
	it("should return empty result when totalCount is 0", async () => {
		mockPrisma.wishlistItem.count.mockResolvedValue(0);
		mockPrisma.wishlistItem.findMany.mockResolvedValue([]);

		const result = await fetchWishlist(VALID_USER_ID, undefined);

		expect(result).toEqual(EMPTY_RESULT);
		expect(mockProcessCursorResults).not.toHaveBeenCalled();
	});

	// processCursorResults called with correct args
	it("should call processCursorResults with items, take, direction and cursor", async () => {
		const items = [createMockWishlistItem()];
		mockPrisma.wishlistItem.findMany.mockResolvedValue(items);
		mockPrisma.wishlistItem.count.mockResolvedValue(1);

		const params = { cursor: "cursor_abc", direction: "forward" as const, perPage: 10 };
		await fetchWishlist(VALID_USER_ID, undefined, params);

		expect(mockProcessCursorResults).toHaveBeenCalledWith(items, 10, "forward", "cursor_abc");
	});

	// perPage of 0 is falsy: falls back to default (20) via the || operator, then Math.max(1, 20) = 20
	it("should fall back to default perPage when perPage is 0 (falsy)", async () => {
		await fetchWishlist(VALID_USER_ID, undefined, { perPage: 0 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
	});

	// perPage clamped to 1 minimum when given a negative number
	it("should clamp perPage to minimum of 1 when given a negative number", async () => {
		await fetchWishlist(VALID_USER_ID, undefined, { perPage: -5 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }));
	});

	// perPage clamped to MAX
	it("should clamp perPage to MAX (200) when given a value above the limit", async () => {
		await fetchWishlist(VALID_USER_ID, undefined, { perPage: 9999 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
	});

	// default perPage applied when not specified
	it("should use default perPage (20) when perPage is not specified", async () => {
		await fetchWishlist(VALID_USER_ID, undefined, {});

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
	});

	// Returns paginated items and pagination from processCursorResults
	it("should return paginatedItems and pagination from processCursorResults", async () => {
		const paginatedItem = createMockWishlistItem({ id: "item_paginated" });
		const pagination = {
			nextCursor: "next_cursor",
			prevCursor: null,
			hasNextPage: true,
			hasPreviousPage: false,
		};
		mockProcessCursorResults.mockReturnValue({ items: [paginatedItem], pagination });
		mockPrisma.wishlistItem.count.mockResolvedValue(5);

		const result = await fetchWishlist(VALID_USER_ID, undefined);

		expect(result.items).toEqual([paginatedItem]);
		expect(result.pagination).toEqual(pagination);
		expect(result.totalCount).toBe(5);
	});

	// count and findMany run in parallel (both receive same where clause)
	it("should run count and findMany with the same where clause", async () => {
		await fetchWishlist(VALID_USER_ID, undefined);

		const countCall = mockPrisma.wishlistItem.count.mock.calls[0]![0];
		const findManyCall = mockPrisma.wishlistItem.findMany.mock.calls[0]![0];

		expect(countCall.where).toEqual(findManyCall.where);
	});

	// Error resilience: exception during DB calls returns empty result
	it("should return empty result when an exception is thrown", async () => {
		mockPrisma.wishlistItem.count.mockRejectedValue(new Error("DB timeout"));

		const result = await fetchWishlist(VALID_USER_ID, undefined);

		expect(result).toEqual(EMPTY_RESULT);
	});

	// Error resilience: findMany exception
	it("should return empty result when findMany throws", async () => {
		mockPrisma.wishlistItem.findMany.mockRejectedValue(new Error("Connection lost"));

		const result = await fetchWishlist(VALID_USER_ID, undefined);

		expect(result).toEqual(EMPTY_RESULT);
	});
});
