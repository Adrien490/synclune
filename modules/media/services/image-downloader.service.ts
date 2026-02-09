/**
 * Image download service with retry and validation.
 *
 * Provides shared utilities for:
 * - Downloading with timeout and size validation
 * - Retry with exponential backoff
 * - Retryable error detection
 *
 * @module modules/media/services/image-downloader.service
 */

import sharp from "sharp";
import { delay } from "@/shared/utils/delay";
import type { DownloadImageOptions, RetryOptions, LogFn } from "../types/image-processing.types";
import { IMAGE_DOWNLOADER_CONFIG } from "../constants/media.constants";

export type { DownloadImageOptions, RetryOptions, LogFn } from "../types/image-processing.types";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Truncates a URL for logging (avoids exposing too much info)
 */
export function truncateUrl(url: string, maxLength: number = 50): string {
	if (url.length <= maxLength) return url;
	return url.substring(0, maxLength) + "...";
}

/**
 * Determines if an error is temporary and worth retrying.
 * - 5xx errors (server) -> retry
 * - Timeout/AbortError -> retry
 * - Network errors -> retry
 * - 4xx errors (client) -> no retry (permanent error)
 */
export function isRetryableError(error: unknown): boolean {
	if (!(error instanceof Error)) return true; // Unknown error, retry

	const message = error.message.toLowerCase();

	// Timeout or abort -> retry
	if (error.name === "AbortError" || message.includes("timeout")) {
		return true;
	}

	// HTTP errors: extract status code
	const httpMatch = message.match(/http\s*(\d{3})/i);
	if (httpMatch) {
		const statusCode = parseInt(httpMatch[1], 10);
		// 4xx = permanent client error (except 408 Request Timeout, 429 Too Many Requests)
		if (statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429) {
			return false;
		}
		// 5xx = temporary server error
		return true;
	}

	// Network errors -> retry
	if (
		message.includes("network") ||
		message.includes("econnrefused") ||
		message.includes("econnreset") ||
		message.includes("etimedout")
	) {
		return true;
	}

	// Default to retry (cautious approach)
	return true;
}

/**
 * Executes a function with retry and exponential backoff.
 * Only retries temporary errors (5xx, timeout, network).
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const maxRetries = options.maxRetries ?? IMAGE_DOWNLOADER_CONFIG.MAX_RETRIES;
	const baseDelay = options.baseDelay ?? IMAGE_DOWNLOADER_CONFIG.RETRY_BASE_DELAY_MS;

	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Check if the error is worth retrying
			if (!isRetryableError(error)) {
				throw lastError; // Permanent error, no retry
			}

			if (attempt < maxRetries - 1) {
				const waitTime = baseDelay * Math.pow(2, attempt);
				await delay(waitTime);
			}
		}
	}

	throw lastError;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Downloads an image and returns the buffer.
 *
 * @param url - URL of the image to download
 * @param options - Download options
 * @throws {Error} If download fails or times out
 */
export async function downloadImage(
	url: string,
	options: DownloadImageOptions = {}
): Promise<Buffer> {
	const timeout = options.downloadTimeout ?? IMAGE_DOWNLOADER_CONFIG.DOWNLOAD_TIMEOUT_MS;
	const maxSize = options.maxImageSize ?? IMAGE_DOWNLOADER_CONFIG.MAX_IMAGE_SIZE;
	const userAgent = options.userAgent ?? IMAGE_DOWNLOADER_CONFIG.USER_AGENT;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				"User-Agent": userAgent,
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// Verify Content-Type (security: avoid downloading HTML/JSON)
		const contentType = response.headers.get("content-type");
		if (!contentType?.startsWith("image/")) {
			throw new Error(`Content-Type invalide: ${contentType || "absent"} (image/* attendu)`);
		}

		// Verify size before full download
		const contentLength = response.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > maxSize) {
			throw new Error(
				`Image trop volumineuse: ${(parseInt(contentLength, 10) / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
			);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Double verification after download
		if (buffer.length > maxSize) {
			throw new Error(
				`Image trop volumineuse: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
			);
		}

		// Validate magic bytes via Sharp metadata (defense-in-depth beyond Content-Type header)
		const metadata = await sharp(buffer).metadata();
		if (!metadata.format) {
			throw new Error("Buffer invalide: format d'image non reconnu par Sharp");
		}

		return buffer;
	} finally {
		clearTimeout(timeoutId);
	}
}
