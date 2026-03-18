import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

import {
	cacheWishlist,
	cacheWishlistCount,
	cacheWishlistProductIds,
	getWishlistInvalidationTags,
} from "../cache.utils";

// ============================================================================
// TESTS
// ============================================================================

describe("cacheWishlist", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("sets cart cache profile", () => {
		cacheWishlist();
		expect(mockCacheLife).toHaveBeenCalledWith("cart");
	});

	it("sets anonymous wishlist tag when no userId or sessionId", () => {
		cacheWishlist();
		expect(mockCacheTag).toHaveBeenCalledWith("wishlist-anonymous");
	});

	it("sets user-scoped wishlist tag when userId is provided", () => {
		cacheWishlist("user-123");
		expect(mockCacheTag).toHaveBeenCalledWith("wishlist-user-user-123");
	});

	it("sets session-scoped wishlist tag when only sessionId is provided", () => {
		cacheWishlist(undefined, "sess-abc");
		expect(mockCacheTag).toHaveBeenCalledWith("wishlist-session-sess-abc");
	});
});

describe("cacheWishlistCount", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("sets cart cache profile", () => {
		cacheWishlistCount();
		expect(mockCacheLife).toHaveBeenCalledWith("cart");
	});

	it("sets anonymous count tag when no userId or sessionId", () => {
		cacheWishlistCount();
		expect(mockCacheTag).toHaveBeenCalledWith("wishlist-count-anonymous");
	});

	it("sets user-scoped count tag when userId is provided", () => {
		cacheWishlistCount("user-123");
		expect(mockCacheTag).toHaveBeenCalledWith("wishlist-count-user-user-123");
	});
});

describe("cacheWishlistProductIds", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("sets cart cache profile", () => {
		cacheWishlistProductIds();
		expect(mockCacheLife).toHaveBeenCalledWith("cart");
	});

	it("sets anonymous product-ids tag when no userId or sessionId", () => {
		cacheWishlistProductIds();
		expect(mockCacheTag).toHaveBeenCalledWith("wishlist-products-anonymous");
	});

	it("sets user-scoped product-ids tag when userId is provided", () => {
		cacheWishlistProductIds("user-456");
		expect(mockCacheTag).toHaveBeenCalledWith("wishlist-products-user-user-456");
	});
});

describe("getWishlistInvalidationTags", () => {
	it("returns anonymous tags when no userId or sessionId", () => {
		const tags = getWishlistInvalidationTags();
		expect(tags).toContain("wishlist-anonymous");
		expect(tags).toContain("wishlist-count-anonymous");
		expect(tags).toContain("wishlist-products-anonymous");
	});

	it("returns user-scoped tags when userId is provided", () => {
		const tags = getWishlistInvalidationTags("user-42");
		expect(tags).toContain("wishlist-user-user-42");
		expect(tags).toContain("wishlist-count-user-user-42");
		expect(tags).toContain("wishlist-products-user-user-42");
	});

	it("returns session-scoped tags when sessionId is provided", () => {
		const tags = getWishlistInvalidationTags(undefined, "sess-xyz");
		expect(tags).toContain("wishlist-session-sess-xyz");
		expect(tags).toContain("wishlist-count-session-sess-xyz");
		expect(tags).toContain("wishlist-products-session-sess-xyz");
	});

	it("returns exactly 3 tags", () => {
		expect(getWishlistInvalidationTags()).toHaveLength(3);
		expect(getWishlistInvalidationTags("user-1")).toHaveLength(3);
	});
});
