/**
 * Constants and utilities for media file validation.
 *
 * Centralizes file size validation logic
 * to avoid duplication across upload forms.
 */

/**
 * File size limits by media type
 */
export const MEDIA_SIZE_LIMITS = {
	/** Images: 16MB max (aligned with UploadThing catalogMedia) */
	IMAGE: 16 * 1024 * 1024,
	/** Videos: 512MB max */
	VIDEO: 512 * 1024 * 1024,
} as const;

/**
 * MIME types considered as videos
 */
export const VIDEO_MIME_PREFIXES = ["video/"] as const;

/**
 * Media file validation result
 */
export interface MediaFileValidationResult {
	/** true if the file is valid */
	valid: boolean;
	/** Error message if invalid */
	error?: string;
	/** Detected media type */
	mediaType: "IMAGE" | "VIDEO";
	/** File size in bytes */
	fileSize: number;
	/** Applicable size limit in bytes */
	sizeLimit: number;
}

/**
 * Determines if a file is a video based on its MIME type
 */
export function isVideoFile(file: File): boolean {
	return VIDEO_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
}

/**
 * Validates a media file (image or video) against size limits.
 *
 * @param file - The file to validate
 * @returns Validation result with details
 *
 * @example
 * const result = validateMediaFile(file);
 * if (!result.valid) {
 *   toast.error(result.error);
 *   return;
 * }
 */
export function validateMediaFile(file: File): MediaFileValidationResult {
	const isVideo = isVideoFile(file);
	const mediaType = isVideo ? "VIDEO" : "IMAGE";
	const sizeLimit = isVideo ? MEDIA_SIZE_LIMITS.VIDEO : MEDIA_SIZE_LIMITS.IMAGE;

	if (file.size > sizeLimit) {
		const sizeMB = (file.size / 1024 / 1024).toFixed(2);
		const limitMB = sizeLimit / 1024 / 1024;
		return {
			valid: false,
			error: `Le fichier dépasse la limite de ${limitMB}MB (${sizeMB}MB)`,
			mediaType,
			fileSize: file.size,
			sizeLimit,
		};
	}

	return {
		valid: true,
		mediaType,
		fileSize: file.size,
		sizeLimit,
	};
}

/**
 * Validates a file intended to be the primary image (no video allowed).
 *
 * @param file - The file to validate
 * @returns Validation result
 *
 * @example
 * const result = validatePrimaryImage(file);
 * if (!result.valid) {
 *   toast.error(result.error);
 *   return;
 * }
 */
export function validatePrimaryImage(file: File): MediaFileValidationResult {
	const isVideo = isVideoFile(file);

	if (isVideo) {
		return {
			valid: false,
			error: "Les vidéos ne peuvent pas être utilisées comme média principal. Veuillez uploader une image (JPG, PNG, WebP, GIF ou AVIF).",
			mediaType: "VIDEO",
			fileSize: file.size,
			sizeLimit: MEDIA_SIZE_LIMITS.VIDEO,
		};
	}

	return validateMediaFile(file);
}

/**
 * Validates multiple files and returns valid files + errors.
 *
 * @param files - The files to validate
 * @param options - Validation options
 * @returns Valid files and encountered errors
 */
export function validateMediaFiles(
	files: File[],
	options?: {
		/** If true, rejects videos */
		rejectVideos?: boolean;
		/** Maximum number of files to keep */
		maxFiles?: number;
	}
): {
	validFiles: File[];
	errors: string[];
	skipped: number;
} {
	const validFiles: File[] = [];
	const errors: string[] = [];
	let skipped = 0;

	const filesToProcess = options?.maxFiles
		? files.slice(0, options.maxFiles)
		: files;

	if (options?.maxFiles && files.length > options.maxFiles) {
		skipped = files.length - options.maxFiles;
	}

	for (const file of filesToProcess) {
		const result = options?.rejectVideos
			? validatePrimaryImage(file)
			: validateMediaFile(file);

		if (result.valid) {
			validFiles.push(file);
		} else if (result.error) {
			errors.push(`${file.name}: ${result.error}`);
		}
	}

	return { validFiles, errors, skipped };
}

// ============================================================================
// VALIDATION HELPERS (used by migration scripts)
// ============================================================================

/** CUID pattern (25 alphanumeric characters starting with 'c') */
const CUID_PATTERN = /^c[a-z0-9]{24}$/;

/**
 * Allowed UploadThing domains (strict list).
 * - Exact domains for main endpoints
 * - Allowed suffixes for dynamic CDN subdomains
 */
const UPLOADTHING_EXACT_HOSTS: Set<string> = new Set([
	"utfs.io",
	"uploadthing.com",
	"ufs.sh",
]);

/**
 * Allowed suffixes for UploadThing subdomains.
 * E.g. x1ain1wpub.ufs.sh, cdn.uploadthing.com
 */
const UPLOADTHING_ALLOWED_SUFFIXES = [".ufs.sh", ".uploadthing.com"] as const;

/**
 * Validates that an ID is a valid CUID.
 * Prevents command injection via malicious IDs.
 */
export function isValidCuid(id: string): boolean {
	return CUID_PATTERN.test(id);
}

/**
 * Validates that a URL comes from an allowed UploadThing domain.
 * - Enforces HTTPS only
 * - Accepts exact domains (utfs.io, uploadthing.com, ufs.sh)
 * - Accepts subdomains (*.ufs.sh, *.uploadthing.com)
 */
export function isValidUploadThingUrl(url: string): boolean {
	try {
		const parsed = new URL(url);

		// Security: enforce HTTPS only
		if (parsed.protocol !== "https:") {
			return false;
		}

		const hostname = parsed.hostname;

		// Exact match check
		if (UPLOADTHING_EXACT_HOSTS.has(hostname)) {
			return true;
		}

		// Allowed subdomain check
		return UPLOADTHING_ALLOWED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
	} catch {
		return false;
	}
}
