/**
 * Image download service and ThumbHash placeholder configuration
 */

import { ALLOWED_UPLOADTHING_DOMAINS } from "./thumbnail.constants";

// ============================================================================
// IMAGE DOWNLOADER CONFIGURATION
// ============================================================================

/**
 * Configuration for the image download service.
 * Shared download/retry defaults also used by THUMBHASH_CONFIG.
 */
export const IMAGE_DOWNLOADER_CONFIG = {
	/** Download timeout (ms) */
	DOWNLOAD_TIMEOUT_MS: 30_000,
	/** Maximum image size (bytes) - 20 MB */
	MAX_IMAGE_SIZE: 20 * 1024 * 1024,
	/** Maximum number of retries */
	MAX_RETRIES: 3,
	/** Base delay between retries (ms) */
	RETRY_BASE_DELAY_MS: 1_000,
	/** User-Agent for requests */
	USER_AGENT: "Synclune-ImageDownloader/1.0",
} as const;

// ============================================================================
// THUMBHASH CONFIGURATION (2025 STANDARD - RECOMMENDED)
// ============================================================================

/**
 * Configuration for ThumbHash placeholder generation
 *
 * ThumbHash is the 2025 standard, created by the author of esbuild:
 * - Ultra-compact: ~25 bytes (vs ~200-300 bytes for plaiceholder)
 * - Transparency support (alpha channel)
 * - Automatically encodes aspect ratio
 * - Better color fidelity than BlurHash
 *
 * Download/retry values are sourced from IMAGE_DOWNLOADER_CONFIG
 * to keep a single source of truth.
 *
 * @see https://evanw.github.io/thumbhash/
 */
export const THUMBHASH_CONFIG = {
	/** Timeout for image download (ms) */
	downloadTimeout: IMAGE_DOWNLOADER_CONFIG.DOWNLOAD_TIMEOUT_MS,
	/** Max image size in bytes */
	maxImageSize: IMAGE_DOWNLOADER_CONFIG.MAX_IMAGE_SIZE,
	/** Max resize dimension (pixels) - ThumbHash limits to 100x100 */
	maxSize: 100,
	/** Number of retries before failure */
	maxRetries: IMAGE_DOWNLOADER_CONFIG.MAX_RETRIES,
	/** Base delay for exponential backoff (ms) */
	retryBaseDelay: IMAGE_DOWNLOADER_CONFIG.RETRY_BASE_DELAY_MS,
	/** Pause between batches (ms) - migration script only */
	batchDelay: 500,
	/** Allowed domains for downloading */
	allowedDomains: ALLOWED_UPLOADTHING_DOMAINS,
} as const;
