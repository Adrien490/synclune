/**
 * Generic retry utility with exponential backoff, AbortSignal support,
 * and pluggable error classification.
 *
 * @module shared/utils/with-retry
 */

import { delay } from "./delay";

export interface WithRetryOptions {
	/** Total number of attempts (default: 3) */
	maxAttempts?: number;
	/** Base delay for exponential backoff in ms (default: 1000) */
	baseDelay?: number;
	/** AbortSignal to cancel retries */
	signal?: AbortSignal;
	/** Optional predicate to classify retryable errors. When provided, non-retryable errors throw immediately. */
	isRetryable?: (error: unknown) => boolean;
}

/**
 * Executes a function with retry and exponential backoff.
 *
 * @example
 * ```ts
 * // Simple retry (3 attempts, 1s base delay)
 * const data = await withRetry(() => fetch(url));
 *
 * // With abort and error classification
 * const data = await withRetry(() => fetch(url), {
 *   maxAttempts: 4,
 *   baseDelay: 500,
 *   signal: controller.signal,
 *   isRetryable: (err) => err instanceof Error && err.message.includes("5"),
 * });
 * ```
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: WithRetryOptions = {}
): Promise<T> {
	const maxAttempts = options.maxAttempts ?? 3;
	const baseDelay = options.baseDelay ?? 1000;
	const { signal, isRetryable } = options;

	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		// Check abort before each attempt
		if (signal?.aborted) {
			throw new DOMException("Operation aborted", "AbortError");
		}

		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Never retry abort errors
			if (error instanceof DOMException && error.name === "AbortError") {
				throw error;
			}

			// Check if error is worth retrying (when discriminator provided)
			if (isRetryable && !isRetryable(error)) {
				throw lastError;
			}

			// Delay before next attempt (skip after last attempt)
			if (attempt < maxAttempts - 1) {
				const waitTime = baseDelay * Math.pow(2, attempt);
				await delay(waitTime);
			}
		}
	}

	throw lastError;
}
