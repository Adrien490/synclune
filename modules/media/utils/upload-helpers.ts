/**
 * Helper functions and constants for the media upload hook.
 *
 * Extracted from use-media-upload.ts to keep each file under 500 lines.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default max image size: 16MB */
export const DEFAULT_MAX_SIZE_IMAGE = 16 * 1024 * 1024;

/** Default max video size: 512MB */
export const DEFAULT_MAX_SIZE_VIDEO = 512 * 1024 * 1024;

/** Default max number of files per upload */
export const DEFAULT_MAX_FILES = 6;

/** Default video upload concurrency */
export const DEFAULT_VIDEO_CONCURRENCY = 2;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formats a byte size into a human-readable string
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determines the media type from the MIME type
 */
export function getMediaTypeFromFile(file: File): "IMAGE" | "VIDEO" {
	return file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
}

/**
 * Checks if a file has a valid media MIME type (image/* or video/*)
 */
export function isValidMediaType(file: File): boolean {
	return file.type.startsWith("image/") || file.type.startsWith("video/");
}
