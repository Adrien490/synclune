import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/utils/delay", () => ({
	delay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sharp", () => {
	const mockSharpInstance = {
		metadata: vi.fn().mockResolvedValue({ format: "jpeg" }),
	};
	return {
		default: vi.fn().mockReturnValue(mockSharpInstance),
	};
});

import { delay } from "@/shared/utils/delay";
import sharp from "sharp";
import { truncateUrl, isRetryableError, withRetry, downloadImage } from "../services/image-downloader.service";
import { IMAGE_DOWNLOADER_CONFIG } from "../constants/media.constants";

const mockDelay = vi.mocked(delay);

// ============================================================================
// truncateUrl
// ============================================================================

describe("truncateUrl", () => {
	it("should return a short URL as-is when it is within the default maxLength", () => {
		const url = "https://example.com/img.jpg";
		expect(truncateUrl(url)).toBe(url);
	});

	it("should return the URL as-is when its length exactly equals the default maxLength", () => {
		const url = "a".repeat(50);
		expect(truncateUrl(url)).toBe(url);
	});

	it("should truncate a long URL and append '...' when it exceeds the default maxLength", () => {
		const url = "https://example.com/" + "x".repeat(100);
		const result = truncateUrl(url);
		expect(result).toBe(url.substring(0, 50) + "...");
		expect(result.endsWith("...")).toBe(true);
	});

	it("should respect a custom maxLength when provided", () => {
		const url = "https://example.com/image.png";
		const result = truncateUrl(url, 20);
		expect(result).toBe(url.substring(0, 20) + "...");
	});

	it("should return the URL as-is when its length equals a custom maxLength boundary", () => {
		const url = "a".repeat(10);
		expect(truncateUrl(url, 10)).toBe(url);
	});

	it("should truncate a URL that is one character over the custom maxLength", () => {
		const url = "a".repeat(11);
		const result = truncateUrl(url, 10);
		expect(result).toBe("aaaaaaaaaa...");
	});
});

// ============================================================================
// isRetryableError
// ============================================================================

describe("isRetryableError", () => {
	it("should return true for a non-Error object (string)", () => {
		expect(isRetryableError("some string error")).toBe(true);
	});

	it("should return true for a non-Error object (null)", () => {
		expect(isRetryableError(null)).toBe(true);
	});

	it("should return true for a non-Error object (plain object)", () => {
		expect(isRetryableError({ message: "oops" })).toBe(true);
	});

	it("should return true for an AbortError", () => {
		const error = new Error("The operation was aborted");
		error.name = "AbortError";
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true when the error message contains 'timeout'", () => {
		const error = new Error("Request timeout exceeded");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true when the error message contains 'TIMEOUT' (case insensitive)", () => {
		const error = new Error("CONNECTION TIMEOUT");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for HTTP 500 Internal Server Error", () => {
		const error = new Error("HTTP 500: Internal Server Error");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for HTTP 502 Bad Gateway", () => {
		const error = new Error("HTTP 502: Bad Gateway");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for HTTP 503 Service Unavailable", () => {
		const error = new Error("HTTP 503: Service Unavailable");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for HTTP 408 Request Timeout (retryable exception in 4xx range)", () => {
		const error = new Error("HTTP 408: Request Timeout");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for HTTP 429 Too Many Requests (retryable exception in 4xx range)", () => {
		const error = new Error("HTTP 429: Too Many Requests");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return false for HTTP 400 Bad Request", () => {
		const error = new Error("HTTP 400: Bad Request");
		expect(isRetryableError(error)).toBe(false);
	});

	it("should return false for HTTP 401 Unauthorized", () => {
		const error = new Error("HTTP 401: Unauthorized");
		expect(isRetryableError(error)).toBe(false);
	});

	it("should return false for HTTP 403 Forbidden", () => {
		const error = new Error("HTTP 403: Forbidden");
		expect(isRetryableError(error)).toBe(false);
	});

	it("should return false for HTTP 404 Not Found", () => {
		const error = new Error("HTTP 404: Not Found");
		expect(isRetryableError(error)).toBe(false);
	});

	it("should return true for ECONNREFUSED network error", () => {
		const error = new Error("connect ECONNREFUSED 127.0.0.1:80");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for ECONNRESET network error", () => {
		const error = new Error("read ECONNRESET");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for ETIMEDOUT network error", () => {
		const error = new Error("connect ETIMEDOUT 93.184.216.34:443");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for a generic network error", () => {
		const error = new Error("network request failed");
		expect(isRetryableError(error)).toBe(true);
	});

	it("should return true for an unknown Error subclass with no special message", () => {
		class UnknownError extends Error {}
		const error = new UnknownError("something went wrong");
		expect(isRetryableError(error)).toBe(true);
	});
});

// ============================================================================
// withRetry
// ============================================================================

describe("withRetry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return the result immediately when the function succeeds on the first attempt", async () => {
		const fn = vi.fn().mockResolvedValue("success");

		const result = await withRetry(fn, { maxRetries: 3, baseDelay: 0 });

		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(mockDelay).not.toHaveBeenCalled();
	});

	it("should retry and return the result when the function fails once then succeeds", async () => {
		const retryableError = new Error("network error");
		const fn = vi
			.fn()
			.mockRejectedValueOnce(retryableError)
			.mockResolvedValueOnce("recovered");

		const result = await withRetry(fn, { maxRetries: 3, baseDelay: 100 });

		expect(result).toBe("recovered");
		expect(fn).toHaveBeenCalledTimes(2);
		expect(mockDelay).toHaveBeenCalledTimes(1);
		expect(mockDelay).toHaveBeenCalledWith(100);
	});

	it("should throw immediately without retrying when the error is non-retryable", async () => {
		const nonRetryableError = new Error("HTTP 404: Not Found");
		const fn = vi.fn().mockRejectedValue(nonRetryableError);

		await expect(withRetry(fn, { maxRetries: 3, baseDelay: 100 })).rejects.toThrow(
			"HTTP 404: Not Found"
		);

		expect(fn).toHaveBeenCalledTimes(1);
		expect(mockDelay).not.toHaveBeenCalled();
	});

	it("should throw the last error after exhausting all retry attempts", async () => {
		const error = new Error("persistent network failure");
		const fn = vi.fn().mockRejectedValue(error);

		await expect(withRetry(fn, { maxRetries: 3, baseDelay: 100 })).rejects.toThrow(
			"persistent network failure"
		);

		expect(fn).toHaveBeenCalledTimes(3);
	});

	it("should not call delay after the last failed attempt", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("network error"));

		await expect(withRetry(fn, { maxRetries: 3, baseDelay: 100 })).rejects.toThrow();

		// delay is called between attempts, so for 3 attempts: 2 delays (after attempt 0 and 1)
		expect(mockDelay).toHaveBeenCalledTimes(2);
	});

	it("should apply exponential backoff between retry attempts", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("network error"));

		await expect(withRetry(fn, { maxRetries: 4, baseDelay: 100 })).rejects.toThrow();

		// Attempt 0 -> delay(100 * 2^0 = 100)
		// Attempt 1 -> delay(100 * 2^1 = 200)
		// Attempt 2 -> delay(100 * 2^2 = 400)
		// Attempt 3 -> no delay (last attempt)
		expect(mockDelay).toHaveBeenCalledTimes(3);
		expect(mockDelay).toHaveBeenNthCalledWith(1, 100);
		expect(mockDelay).toHaveBeenNthCalledWith(2, 200);
		expect(mockDelay).toHaveBeenNthCalledWith(3, 400);
	});

	it("should use IMAGE_DOWNLOADER_CONFIG defaults when no options are provided", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("network error"));

		await expect(withRetry(fn)).rejects.toThrow();

		expect(fn).toHaveBeenCalledTimes(IMAGE_DOWNLOADER_CONFIG.MAX_RETRIES);
		// First delay should use the configured base delay
		expect(mockDelay).toHaveBeenNthCalledWith(1, IMAGE_DOWNLOADER_CONFIG.RETRY_BASE_DELAY_MS);
	});

	it("should wrap non-Error thrown values in an Error before throwing", async () => {
		const fn = vi.fn().mockRejectedValue("raw string error");

		await expect(withRetry(fn, { maxRetries: 1, baseDelay: 0 })).rejects.toThrow(
			"raw string error"
		);
	});

	it("should succeed on the last allowed attempt without throwing", async () => {
		const error = new Error("network error");
		const fn = vi
			.fn()
			.mockRejectedValueOnce(error)
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce("final success");

		const result = await withRetry(fn, { maxRetries: 3, baseDelay: 50 });

		expect(result).toBe("final success");
		expect(fn).toHaveBeenCalledTimes(3);
	});
});

// ============================================================================
// downloadImage
// ============================================================================

describe("downloadImage", () => {
	const TEST_URL = "https://example.com/photo.jpg";
	const SMALL_BUFFER = Buffer.from("fake-image-data");

	// Typed reference to the sharp mock factory for per-test overrides
	const mockSharp = vi.mocked(sharp);

	function makeResponse(
		options: {
			ok?: boolean;
			status?: number;
			statusText?: string;
			contentType?: string | null;
			contentLength?: string | null;
			body?: ArrayBuffer;
		} = {}
	): Response {
		const {
			ok = true,
			status = 200,
			statusText = "OK",
			contentType = "image/jpeg",
			contentLength = null,
			body = SMALL_BUFFER.buffer,
		} = options;

		const headers = new Headers();
		if (contentType !== null) headers.set("content-type", contentType);
		if (contentLength !== null) headers.set("content-length", contentLength);

		return {
			ok,
			status,
			statusText,
			headers,
			arrayBuffer: vi.fn().mockResolvedValue(body),
		} as unknown as Response;
	}

	beforeEach(() => {
		vi.clearAllMocks();

		// Restore default sharp mock: returns a valid format
		mockSharp.mockReturnValue({
			metadata: vi.fn().mockResolvedValue({ format: "jpeg" }),
		} as ReturnType<typeof sharp>);

		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse()));
	});

	// --------------------------------------------------------------------------
	// Successful download
	// --------------------------------------------------------------------------

	it("should return a Buffer on a successful download with a valid image", async () => {
		const result = await downloadImage(TEST_URL);

		expect(result).toBeInstanceOf(Buffer);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should pass the default User-Agent header to fetch", async () => {
		await downloadImage(TEST_URL);

		expect(vi.mocked(fetch)).toHaveBeenCalledWith(
			TEST_URL,
			expect.objectContaining({
				headers: expect.objectContaining({
					"User-Agent": IMAGE_DOWNLOADER_CONFIG.USER_AGENT,
				}),
			})
		);
	});

	it("should call sharp with the downloaded buffer to validate magic bytes", async () => {
		await downloadImage(TEST_URL);

		expect(mockSharp).toHaveBeenCalledWith(expect.any(Buffer));
	});

	// --------------------------------------------------------------------------
	// HTTP error status
	// --------------------------------------------------------------------------

	it("should throw with the HTTP status when the response is 404", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(makeResponse({ ok: false, status: 404, statusText: "Not Found" }))
		);

		await expect(downloadImage(TEST_URL)).rejects.toThrow("HTTP 404: Not Found");
	});

	it("should throw with the HTTP status when the response is 500", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeResponse({ ok: false, status: 500, statusText: "Internal Server Error" })
			)
		);

		await expect(downloadImage(TEST_URL)).rejects.toThrow("HTTP 500: Internal Server Error");
	});

	// --------------------------------------------------------------------------
	// Content-Type validation
	// --------------------------------------------------------------------------

	it("should throw when Content-Type is text/html", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(makeResponse({ contentType: "text/html; charset=utf-8" }))
		);

		await expect(downloadImage(TEST_URL)).rejects.toThrow(
			"Content-Type invalide: text/html; charset=utf-8 (image/* attendu)"
		);
	});

	it("should throw when Content-Type is application/json", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(makeResponse({ contentType: "application/json" }))
		);

		await expect(downloadImage(TEST_URL)).rejects.toThrow(
			"Content-Type invalide: application/json (image/* attendu)"
		);
	});

	it("should throw with 'absent' when Content-Type header is missing", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(makeResponse({ contentType: null }))
		);

		await expect(downloadImage(TEST_URL)).rejects.toThrow(
			"Content-Type invalide: absent (image/* attendu)"
		);
	});

	it("should not throw for image/png Content-Type", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(makeResponse({ contentType: "image/png" }))
		);

		await expect(downloadImage(TEST_URL)).resolves.toBeInstanceOf(Buffer);
	});

	// --------------------------------------------------------------------------
	// Content-Length size check (before download)
	// --------------------------------------------------------------------------

	it("should throw before downloading when Content-Length exceeds maxImageSize", async () => {
		const maxSize = 1 * 1024 * 1024; // 1 MB
		const declaredSize = 2 * 1024 * 1024; // 2 MB

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeResponse({ contentLength: String(declaredSize) })
			)
		);

		await expect(downloadImage(TEST_URL, { maxImageSize: maxSize })).rejects.toThrow(
			"Image trop volumineuse: 2.00MB (max: 1MB)"
		);
	});

	it("should not reject when Content-Length is exactly at maxImageSize", async () => {
		const maxSize = 1 * 1024 * 1024;

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeResponse({ contentLength: String(maxSize) })
			)
		);

		await expect(downloadImage(TEST_URL, { maxImageSize: maxSize })).resolves.toBeInstanceOf(Buffer);
	});

	// --------------------------------------------------------------------------
	// Buffer size check after download (server lied about Content-Length)
	// --------------------------------------------------------------------------

	it("should throw after download when the actual buffer exceeds maxImageSize even if Content-Length was absent", async () => {
		const maxSize = 5; // 5 bytes - tiny limit
		// Body is larger than maxSize
		const largeBody = new Uint8Array(10).buffer;

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeResponse({ contentLength: null, body: largeBody })
			)
		);

		await expect(downloadImage(TEST_URL, { maxImageSize: maxSize })).rejects.toThrow(
			"Image trop volumineuse"
		);
	});

	it("should throw after download when server sent a smaller Content-Length than the actual body", async () => {
		const maxSize = 1 * 1024 * 1024; // 1 MB
		const declaredSize = String(512 * 1024); // 512 KB - passes pre-check
		const actualBody = new Uint8Array(2 * 1024 * 1024).buffer; // 2 MB actual

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeResponse({ contentLength: declaredSize, body: actualBody })
			)
		);

		await expect(downloadImage(TEST_URL, { maxImageSize: maxSize })).rejects.toThrow(
			"Image trop volumineuse: 2.00MB (max: 1MB)"
		);
	});

	// --------------------------------------------------------------------------
	// Sharp magic byte validation
	// --------------------------------------------------------------------------

	it("should throw when Sharp cannot identify the image format", async () => {
		mockSharp.mockReturnValue({
			metadata: vi.fn().mockResolvedValue({ format: undefined }),
		} as ReturnType<typeof sharp>);

		await expect(downloadImage(TEST_URL)).rejects.toThrow(
			"Buffer invalide: format d'image non reconnu par Sharp"
		);
	});

	it("should throw when Sharp metadata rejects (corrupt data)", async () => {
		mockSharp.mockReturnValue({
			metadata: vi.fn().mockRejectedValue(new Error("unsupported image format")),
		} as ReturnType<typeof sharp>);

		await expect(downloadImage(TEST_URL)).rejects.toThrow("unsupported image format");
	});

	it("should succeed when Sharp identifies a webp format", async () => {
		mockSharp.mockReturnValue({
			metadata: vi.fn().mockResolvedValue({ format: "webp" }),
		} as ReturnType<typeof sharp>);

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(makeResponse({ contentType: "image/webp" }))
		);

		await expect(downloadImage(TEST_URL)).resolves.toBeInstanceOf(Buffer);
	});

	// --------------------------------------------------------------------------
	// Custom options
	// --------------------------------------------------------------------------

	it("should use a custom userAgent when provided via options", async () => {
		const customAgent = "MyBot/2.0";
		await downloadImage(TEST_URL, { userAgent: customAgent });

		expect(vi.mocked(fetch)).toHaveBeenCalledWith(
			TEST_URL,
			expect.objectContaining({
				headers: expect.objectContaining({
					"User-Agent": customAgent,
				}),
			})
		);
	});

	it("should respect a custom maxImageSize passed via options", async () => {
		const maxSize = 1 * 1024 * 1024;
		const oversizedBody = String(maxSize + 1);

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeResponse({ contentLength: oversizedBody })
			)
		);

		await expect(downloadImage(TEST_URL, { maxImageSize: maxSize })).rejects.toThrow(
			"Image trop volumineuse"
		);
	});

	// --------------------------------------------------------------------------
	// AbortController timeout
	// --------------------------------------------------------------------------

	it("should abort the fetch when the download exceeds the timeout", async () => {
		vi.useFakeTimers();

		vi.stubGlobal(
			"fetch",
			vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				// Simulate a fetch that fires the abort signal after the timer runs
				return new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						const abortError = new Error("The operation was aborted");
						abortError.name = "AbortError";
						reject(abortError);
					});
				});
			})
		);

		const downloadPromise = downloadImage(TEST_URL, { downloadTimeout: 100 });

		// Advance past the timeout
		vi.advanceTimersByTime(200);

		await expect(downloadPromise).rejects.toThrow("The operation was aborted");

		vi.useRealTimers();
	});

	it("should clear the timeout after a successful download", async () => {
		const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

		await downloadImage(TEST_URL);

		expect(clearTimeoutSpy).toHaveBeenCalled();

		clearTimeoutSpy.mockRestore();
	});

	it("should clear the timeout even when an error is thrown", async () => {
		const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(makeResponse({ ok: false, status: 404, statusText: "Not Found" }))
		);

		await expect(downloadImage(TEST_URL)).rejects.toThrow();
		expect(clearTimeoutSpy).toHaveBeenCalled();

		clearTimeoutSpy.mockRestore();
	});
});
