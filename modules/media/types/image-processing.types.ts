/**
 * Types for image processing services
 *
 * Groups types for:
 * - Image downloading (image-downloader.service)
 * - ThumbHash generation (generate-thumbhash)
 *
 * @module modules/media/types/image-processing.types
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/** Log function for warnings */
export type LogFn = (message: string, data?: Record<string, unknown>) => void;

// ============================================================================
// IMAGE DOWNLOADER
// ============================================================================

export interface DownloadImageOptions {
	/** Download timeout (ms) */
	downloadTimeout?: number;
	/** Max image size (bytes) */
	maxImageSize?: number;
	/** Custom User-Agent */
	userAgent?: string;
}

export interface RetryOptions {
	/** Max number of attempts */
	maxRetries?: number;
	/** Base delay for exponential backoff (ms) */
	baseDelay?: number;
}

// ============================================================================
// THUMBHASH
// ============================================================================

export type ThumbHashLogFn = LogFn;

export interface GenerateThumbHashOptions {
	/** Download timeout (ms) */
	downloadTimeout?: number;
	/** Max image size (bytes) */
	maxImageSize?: number;
	/** Max resize dimension (pixels, max 100) */
	maxSize?: number;
	/** Validate that the URL is an UploadThing domain */
	validateDomain?: boolean;
	/** Custom log function (default: console.warn) */
	logWarning?: ThumbHashLogFn;
}

export interface ThumbHashResult {
	/** Binary hash encoded in base64 (~25 bytes) */
	hash: string;
	/** Data URL compatible with Next.js Image blurDataURL */
	dataUrl: string;
	/** Analyzed image width */
	width: number;
	/** Analyzed image height */
	height: number;
}
