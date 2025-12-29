/**
 * Service de telechargement d'images avec retry et validation
 *
 * Fournit des utilitaires partages pour:
 * - Telechargement avec timeout et validation taille
 * - Retry avec backoff exponentiel
 * - Detection d'erreurs retryables
 *
 * @module modules/media/services/image-downloader.service
 */

import { delay } from "@/shared/utils/delay";
import type { DownloadImageOptions, RetryOptions, LogFn } from "../types/image-processing.types";

export type { DownloadImageOptions, RetryOptions, LogFn } from "../types/image-processing.types";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_DOWNLOAD_TIMEOUT = 30000;
const DEFAULT_MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY = 1000;
const DEFAULT_USER_AGENT = "Synclune-ImageDownloader/1.0";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Tronque une URL pour les logs (evite d'exposer trop d'info)
 */
export function truncateUrl(url: string, maxLength: number = 50): string {
	if (url.length <= maxLength) return url;
	return url.substring(0, maxLength) + "...";
}

/**
 * Determine si une erreur est temporaire et merite un retry
 * - Erreurs 5xx (serveur) -> retry
 * - Timeout/AbortError -> retry
 * - Erreurs reseau -> retry
 * - Erreurs 4xx (client) -> pas de retry (erreur permanente)
 */
export function isRetryableError(error: unknown): boolean {
	if (!(error instanceof Error)) return true; // Erreur inconnue, on retry

	const message = error.message.toLowerCase();

	// Timeout ou abort -> retry
	if (error.name === "AbortError" || message.includes("timeout")) {
		return true;
	}

	// Erreurs HTTP: extraire le code
	const httpMatch = message.match(/http\s*(\d{3})/i);
	if (httpMatch) {
		const statusCode = parseInt(httpMatch[1], 10);
		// 4xx = erreur client permanente (sauf 408 Request Timeout, 429 Too Many Requests)
		if (statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429) {
			return false;
		}
		// 5xx = erreur serveur temporaire
		return true;
	}

	// Erreurs reseau -> retry
	if (
		message.includes("network") ||
		message.includes("econnrefused") ||
		message.includes("econnreset") ||
		message.includes("etimedout")
	) {
		return true;
	}

	// Par defaut, on retry (prudence)
	return true;
}

/**
 * Executer une fonction avec retry et backoff exponentiel
 * Ne retry que les erreurs temporaires (5xx, timeout, reseau)
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
	const baseDelay = options.baseDelay ?? DEFAULT_RETRY_BASE_DELAY;

	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Verifier si l'erreur merite un retry
			if (!isRetryableError(error)) {
				throw lastError; // Erreur permanente, pas de retry
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
 * Telecharge une image et retourne le buffer
 *
 * @param url - URL de l'image a telecharger
 * @param options - Options de telechargement
 * @throws {Error} Si le telechargement echoue ou timeout
 */
export async function downloadImage(
	url: string,
	options: DownloadImageOptions = {}
): Promise<Buffer> {
	const timeout = options.downloadTimeout ?? DEFAULT_DOWNLOAD_TIMEOUT;
	const maxSize = options.maxImageSize ?? DEFAULT_MAX_IMAGE_SIZE;
	const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

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

		// Verifier la taille avant telechargement complet
		const contentLength = response.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > maxSize) {
			throw new Error(
				`Image trop volumineuse: ${(parseInt(contentLength, 10) / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
			);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Double verification apres telechargement
		if (buffer.length > maxSize) {
			throw new Error(
				`Image trop volumineuse: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
			);
		}

		return buffer;
	} finally {
		clearTimeout(timeoutId);
	}
}
