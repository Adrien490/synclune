/**
 * Helper functions and constants for the media upload hook.
 *
 * Extracted from use-media-upload.ts to keep each file under 500 lines.
 */

import {
	MAX_UPLOAD_COUNT_IMAGE,
	MAX_UPLOAD_SIZE_IMAGE,
	MAX_UPLOAD_SIZE_VIDEO,
} from "@/modules/media/constants/upload-size-limits";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default max image size. SSOT: `constants/upload-size-limits.ts`. */
export const DEFAULT_MAX_SIZE_IMAGE = MAX_UPLOAD_SIZE_IMAGE;

/** Default max video size. SSOT: `constants/upload-size-limits.ts`. */
export const DEFAULT_MAX_SIZE_VIDEO = MAX_UPLOAD_SIZE_VIDEO;

/** Default max number of files per upload */
export const DEFAULT_MAX_FILES = MAX_UPLOAD_COUNT_IMAGE;

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
 * Checks if a file has a valid media MIME type (image/* or video/*).
 * iOS sometimes drops the MIME type → also accept files whose extension matches.
 */
const FALLBACK_IMAGE_EXTENSIONS = [
	".heic",
	".heif",
	".jpg",
	".jpeg",
	".png",
	".webp",
	".gif",
	".avif",
];
// `.mov` retiré (audit média M13) : le serveur n'accepte que `video/mp4`
// (`ALLOWED_VIDEO_TYPES`). L'accepter côté client laissait l'utilisateur
// téléverser un fichier entier — jusqu'à 64 Mo — avant un rejet serveur.
const FALLBACK_VIDEO_EXTENSIONS = [".mp4"];

export function isValidMediaType(file: File): boolean {
	if (file.type.startsWith("image/") || file.type.startsWith("video/")) return true;
	// iOS Safari occasionally yields empty MIME for HEIC drops — fall back to extension
	const name = file.name.toLowerCase();
	return (
		FALLBACK_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
		FALLBACK_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))
	);
}
