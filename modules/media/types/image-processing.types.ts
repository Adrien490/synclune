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
