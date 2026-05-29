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

// ============================================================================
// DISPLAY LABELS (SSOT for upload-zone copy)
// ============================================================================

/**
 * Human-readable list of accepted image formats, shown in upload-zone hints.
 * Derived from IMAGE_EXTENSIONS (JPG/JPEG collapsed to "JPEG") + HEIC, which is
 * accepted server-side and auto-converted to WebP.
 */
export const IMAGE_FORMATS_LABEL = "JPEG, PNG, GIF, WebP, AVIF, HEIC";

/** Human-readable list of accepted video formats, shown in upload-zone hints. */
export const VIDEO_FORMATS_LABEL = "MP4";
