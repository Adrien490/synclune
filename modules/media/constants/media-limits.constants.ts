/**
 * Media limits, supported extensions, and MIME types
 */

// ============================================================================
// MEDIA LIMITS
// ============================================================================

/** Maximum number of images in the product gallery (across all SKUs) */
export const MAX_GALLERY_IMAGES = 20;

// ============================================================================
// SUPPORTED EXTENSIONS
// ============================================================================

/** Supported video extensions (MP4 only for universal cross-browser compatibility) */
export const VIDEO_EXTENSIONS = [".mp4"] as const;

/** Supported image extensions */
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"] as const;
