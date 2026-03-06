/**
 * Media limits, supported extensions, and MIME types
 */

// ============================================================================
// MEDIA LIMITS PER ITEM
// ============================================================================

/** Maximum number of media per product/SKU (total) */
export const MAX_MEDIA_PER_ITEM = 6;

/** Maximum number of media in SKU gallery (excluding primary image) */
export const MAX_GALLERY_MEDIA = 5;

/** Maximum number of images in the product gallery (across all SKUs) */
export const MAX_GALLERY_IMAGES = 20;

// ============================================================================
// SUPPORTED EXTENSIONS
// ============================================================================

/** Supported video extensions (MP4 only for universal cross-browser compatibility) */
export const VIDEO_EXTENSIONS = [".mp4"] as const;

/** Supported image extensions */
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"] as const;

// ============================================================================
// MIME TYPES
// ============================================================================

/** Video MIME types (MP4 only for universal cross-browser compatibility) */
export const VIDEO_MIME_TYPES = ["video/mp4"] as const;

/** Image MIME types */
export const IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/avif",
] as const;
