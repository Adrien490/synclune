/**
 * Utilities for Reviews module cache management
 * Re-exports cache functions from constants for convenience
 */

export {
	REVIEWS_CACHE_TAGS,
	cacheProductReviews,
	cacheProductReviewStats,
	cacheUserReviews,
	cacheReviewableProducts,
	cacheReviewsAdmin,
	getReviewInvalidationTags,
	getReviewModerationTags,
} from "../constants/cache"
