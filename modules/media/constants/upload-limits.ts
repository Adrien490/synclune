/**
 * Centralized upload rate limit configuration
 *
 * This file defines all rate limiting thresholds for UploadThing uploads.
 * Modify these values to adjust limits without touching business logic.
 *
 * LIMIT PHILOSOPHY:
 * - Admin: More permissive limits (legitimate, controlled actions)
 * - Authenticated users: Moderate limits
 * - Visitors: Strict limits (abuse risk)
 */

import type { RateLimitConfig } from "@/shared/lib/rate-limit";

/**
 * Converts minutes to milliseconds
 */
const minutes = (n: number) => n * 60 * 1000;

// ========================================
// ADMIN UPLOADS
// ========================================

/**
 * Rate limit for testimonial photos (admin only)
 *
 * Context: Testimonial author photos
 * Moderate limit since admin = trusted user
 */
export const UPLOAD_TESTIMONIAL_LIMIT: RateLimitConfig = {
	limit: 5, // 5 uploads maximum
	windowMs: minutes(1), // per minute
};

/**
 * Rate limit for catalog media (admin only)
 *
 * Context: Product/SKU images and videos
 * More permissive due to frequent admin workflow (adding products)
 */
export const UPLOAD_CATALOG_LIMIT: RateLimitConfig = {
	limit: 10, // 10 uploads maximum
	windowMs: minutes(1), // per minute
};

// ========================================
// PUBLIC UPLOADS
// ========================================

/**
 * Rate limit for contact form attachments
 *
 * VERY STRICT: Public endpoint, high abuse risk
 * Protects against:
 * - File spam
 * - Storage saturation
 * - Malicious usage
 */
export const UPLOAD_CONTACT_ATTACHMENT_LIMIT: RateLimitConfig = {
	limit: 3, // 3 uploads maximum
	windowMs: minutes(10), // per 10 minutes
};

// ========================================
// USER UPLOADS
// ========================================

/**
 * Rate limit for review photos (authenticated users)
 *
 * Context: Photos accompanying product reviews
 * Moderate since users are authenticated
 */
export const UPLOAD_REVIEW_MEDIA_LIMIT: RateLimitConfig = {
	limit: 5, // 5 uploads maximum
	windowMs: minutes(1), // per minute
};

// ========================================
// ADMIN DELETE OPERATIONS
// ========================================

/**
 * Rate limit for media file deletion (admin only)
 *
 * Context: Deleting UploadThing files from admin panel
 * Moderate limit to prevent mass deletion by compromised admin
 */
export const DELETE_MEDIA_LIMIT: RateLimitConfig = {
	limit: 20, // 20 deletions maximum
	windowMs: minutes(1), // per minute
};

// ========================================
// GROUPED EXPORT
// ========================================

/**
 * All upload limits grouped by context
 */
export const UPLOAD_LIMITS = {
	// Admin
	TESTIMONIAL: UPLOAD_TESTIMONIAL_LIMIT,
	CATALOG: UPLOAD_CATALOG_LIMIT,
	// Public
	CONTACT_ATTACHMENT: UPLOAD_CONTACT_ATTACHMENT_LIMIT,
	// Users
	REVIEW_MEDIA: UPLOAD_REVIEW_MEDIA_LIMIT,
} as const;

/**
 * Media operation limits (non-upload)
 */
export const MEDIA_LIMITS = {
	DELETE: DELETE_MEDIA_LIMIT,
} as const;
