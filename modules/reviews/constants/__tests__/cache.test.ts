import { describe, it, expect, vi } from "vitest"

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}))

import {
	REVIEWS_CACHE_TAGS,
	getReviewInvalidationTags,
	getReviewModerationTags,
} from "../cache"

// ============================================================================
// REVIEWS_CACHE_TAGS
// ============================================================================

describe("REVIEWS_CACHE_TAGS", () => {
	it("generates product tag with productId", () => {
		expect(REVIEWS_CACHE_TAGS.PRODUCT("prod-123")).toBe("reviews-product-prod-123")
	})

	it("generates stats tag with productId", () => {
		expect(REVIEWS_CACHE_TAGS.STATS("prod-123")).toBe("reviews-stats-prod-123")
	})

	it("generates user tag with userId", () => {
		expect(REVIEWS_CACHE_TAGS.USER("user-456")).toBe("reviews-user-user-456")
	})

	it("generates reviewable tag with userId", () => {
		expect(REVIEWS_CACHE_TAGS.REVIEWABLE("user-456")).toBe("reviewable-products-user-456")
	})

	it("generates detail tag with reviewId", () => {
		expect(REVIEWS_CACHE_TAGS.DETAIL("rev-789")).toBe("review-rev-789")
	})

	it("generates admin detail tag with reviewId", () => {
		expect(REVIEWS_CACHE_TAGS.ADMIN_DETAIL("rev-789")).toBe("review-admin-rev-789")
	})

	it("has static admin list tag", () => {
		expect(REVIEWS_CACHE_TAGS.ADMIN_LIST).toBe("reviews-admin-list")
	})

	it("has static homepage tag", () => {
		expect(REVIEWS_CACHE_TAGS.HOMEPAGE).toBe("homepage-reviews")
	})

	it("has static global stats tag", () => {
		expect(REVIEWS_CACHE_TAGS.GLOBAL_STATS).toBe("global-review-stats")
	})
})

// ============================================================================
// getReviewInvalidationTags
// ============================================================================

describe("getReviewInvalidationTags", () => {
	it("includes user, reviewable, admin list, homepage, and global stats tags", () => {
		const tags = getReviewInvalidationTags("prod-1", "user-1")

		expect(tags).toContain(REVIEWS_CACHE_TAGS.USER("user-1"))
		expect(tags).toContain(REVIEWS_CACHE_TAGS.REVIEWABLE("user-1"))
		expect(tags).toContain(REVIEWS_CACHE_TAGS.ADMIN_LIST)
		expect(tags).toContain(REVIEWS_CACHE_TAGS.HOMEPAGE)
		expect(tags).toContain(REVIEWS_CACHE_TAGS.GLOBAL_STATS)
	})

	it("includes product and stats tags when productId is provided", () => {
		const tags = getReviewInvalidationTags("prod-1", "user-1")

		expect(tags).toContain(REVIEWS_CACHE_TAGS.PRODUCT("prod-1"))
		expect(tags).toContain(REVIEWS_CACHE_TAGS.STATS("prod-1"))
	})

	it("excludes product and stats tags when productId is null", () => {
		const tags = getReviewInvalidationTags(null, "user-1")

		expect(tags).not.toContain(REVIEWS_CACHE_TAGS.PRODUCT("null"))
		expect(tags).not.toContain(REVIEWS_CACHE_TAGS.STATS("null"))
		// Should not contain any product-prefixed tags
		expect(tags.filter((t) => t.startsWith("reviews-product-"))).toHaveLength(0)
		expect(tags.filter((t) => t.startsWith("reviews-stats-"))).toHaveLength(0)
	})

	it("includes detail and admin detail tags when reviewId is provided", () => {
		const tags = getReviewInvalidationTags("prod-1", "user-1", "rev-1")

		expect(tags).toContain(REVIEWS_CACHE_TAGS.DETAIL("rev-1"))
		expect(tags).toContain(REVIEWS_CACHE_TAGS.ADMIN_DETAIL("rev-1"))
	})

	it("excludes detail tags when reviewId is not provided", () => {
		const tags = getReviewInvalidationTags("prod-1", "user-1")

		expect(tags.filter((t) => t.startsWith("review-"))).toHaveLength(0)
	})

	it("returns no duplicate tags", () => {
		const tags = getReviewInvalidationTags("prod-1", "user-1", "rev-1")
		const uniqueTags = [...new Set(tags)]

		expect(tags).toHaveLength(uniqueTags.length)
	})
})

// ============================================================================
// getReviewModerationTags
// ============================================================================

describe("getReviewModerationTags", () => {
	it("includes detail, admin detail, admin list, homepage, and global stats", () => {
		const tags = getReviewModerationTags("prod-1", "rev-1")

		expect(tags).toContain(REVIEWS_CACHE_TAGS.DETAIL("rev-1"))
		expect(tags).toContain(REVIEWS_CACHE_TAGS.ADMIN_DETAIL("rev-1"))
		expect(tags).toContain(REVIEWS_CACHE_TAGS.ADMIN_LIST)
		expect(tags).toContain(REVIEWS_CACHE_TAGS.HOMEPAGE)
		expect(tags).toContain(REVIEWS_CACHE_TAGS.GLOBAL_STATS)
	})

	it("includes product and stats tags when productId is provided", () => {
		const tags = getReviewModerationTags("prod-1", "rev-1")

		expect(tags).toContain(REVIEWS_CACHE_TAGS.PRODUCT("prod-1"))
		expect(tags).toContain(REVIEWS_CACHE_TAGS.STATS("prod-1"))
	})

	it("excludes product and stats tags when productId is null", () => {
		const tags = getReviewModerationTags(null, "rev-1")

		expect(tags.filter((t) => t.startsWith("reviews-product-"))).toHaveLength(0)
		expect(tags.filter((t) => t.startsWith("reviews-stats-"))).toHaveLength(0)
	})

	it("does not include user-specific tags (unlike invalidation tags)", () => {
		const tags = getReviewModerationTags("prod-1", "rev-1")

		expect(tags.filter((t) => t.startsWith("reviews-user-"))).toHaveLength(0)
		expect(tags.filter((t) => t.startsWith("reviewable-products-"))).toHaveLength(0)
	})

	it("returns no duplicate tags", () => {
		const tags = getReviewModerationTags("prod-1", "rev-1")
		const uniqueTags = [...new Set(tags)]

		expect(tags).toHaveLength(uniqueTags.length)
	})
})
