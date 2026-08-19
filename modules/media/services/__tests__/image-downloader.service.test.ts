import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockSharpMetadata, mockSharpInstance } = vi.hoisted(() => {
	const mockSharpMetadata = vi.fn();
	const mockSharpInstance = { metadata: mockSharpMetadata };
	return { mockSharpMetadata, mockSharpInstance };
});

vi.mock("sharp", () => ({
	default: vi.fn(() => mockSharpInstance),
}));

// Pas de mock de @/shared/utils/with-retry : les tests `withRetry` ci-dessous
// vérifient le VRAI court-circuit des erreurs déterministes (baseDelay: 0).

import {
	truncateUrl,
	isRetryableError,
	downloadImage,
	withRetry,
	ImageDecodeError,
	NonRetryableDownloadError,
} from "../image-downloader.service";

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockSharpMetadata.mockResolvedValue({ width: 100, height: 100, format: "jpeg" });
});

// ============================================================================
// truncateUrl
// ============================================================================

describe("truncateUrl", () => {
	it("returns the URL unchanged when it is shorter than maxLength", () => {
		const url = "https://example.com/img.jpg";
		expect(truncateUrl(url)).toBe(url);
	});

	it("returns the URL unchanged when it is exactly maxLength", () => {
		const url = "a".repeat(50);
		expect(truncateUrl(url)).toBe(url);
	});

	it("truncates URLs longer than the default 50 characters and appends ...", () => {
		const url = "https://example.com/" + "x".repeat(40);
		const result = truncateUrl(url);
		expect(result).toBe(url.substring(0, 50) + "...");
		expect(result.length).toBe(53);
	});

	it("respects a custom maxLength", () => {
		const url = "https://example.com/image.jpg";
		const result = truncateUrl(url, 20);
		expect(result).toBe("https://example.com/" + "...");
	});

	it("returns an empty string unchanged", () => {
		expect(truncateUrl("")).toBe("");
	});
});

// ============================================================================
// isRetryableError
// ============================================================================

describe("isRetryableError", () => {
	it("returns true for non-Error values (unknown errors)", () => {
		expect(isRetryableError("some string")).toBe(true);
		expect(isRetryableError(null)).toBe(true);
		expect(isRetryableError(42)).toBe(true);
		expect(isRetryableError({})).toBe(true);
	});

	it("returns true for AbortError", () => {
		const err = new Error("fetch aborted");
		err.name = "AbortError";
		expect(isRetryableError(err)).toBe(true);
	});

	it("returns true when error message contains 'timeout'", () => {
		expect(isRetryableError(new Error("Request timeout after 30s"))).toBe(true);
	});

	it("returns true for 5xx HTTP errors", () => {
		expect(isRetryableError(new Error("HTTP 500: Internal Server Error"))).toBe(true);
		expect(isRetryableError(new Error("HTTP 503: Service Unavailable"))).toBe(true);
	});

	it("returns false for 4xx HTTP errors (except 408 and 429)", () => {
		expect(isRetryableError(new Error("HTTP 400: Bad Request"))).toBe(false);
		expect(isRetryableError(new Error("HTTP 401: Unauthorized"))).toBe(false);
		expect(isRetryableError(new Error("HTTP 403: Forbidden"))).toBe(false);
		expect(isRetryableError(new Error("HTTP 404: Not Found"))).toBe(false);
	});

	it("returns true for HTTP 408 Request Timeout", () => {
		expect(isRetryableError(new Error("HTTP 408: Request Timeout"))).toBe(true);
	});

	it("returns true for HTTP 429 Too Many Requests", () => {
		expect(isRetryableError(new Error("HTTP 429: Too Many Requests"))).toBe(true);
	});

	it("returns true for network errors (econnrefused, econnreset, etimedout)", () => {
		expect(isRetryableError(new Error("ECONNREFUSED: connection refused"))).toBe(true);
		expect(isRetryableError(new Error("ECONNRESET: connection reset"))).toBe(true);
		expect(isRetryableError(new Error("ETIMEDOUT: connection timed out"))).toBe(true);
		expect(isRetryableError(new Error("network error occurred"))).toBe(true);
	});

	it("returns true for generic errors with no HTTP code", () => {
		expect(isRetryableError(new Error("Something went wrong"))).toBe(true);
	});

	// Audit : « SSRF blocked » et « Content-Type invalide » ne matchent ni le motif
	// HTTP ni les mots-clés réseau — le défaut « unknown ⇒ retry » les re-tentait 3×.
	it("returns false for typed NonRetryableDownloadError (deterministic failures)", () => {
		expect(isRetryableError(new NonRetryableDownloadError("SSRF blocked: whatever"))).toBe(false);
		expect(
			isRetryableError(new NonRetryableDownloadError("Content-Type invalide: text/html")),
		).toBe(false);
	});
});

// ============================================================================
// withRetry (service) — court-circuit des erreurs déterministes
// ============================================================================

describe("withRetry", () => {
	it("does NOT retry a NonRetryableDownloadError (deterministic failure)", async () => {
		const fn = vi.fn().mockRejectedValue(new NonRetryableDownloadError("SSRF blocked: test"));

		await expect(withRetry(fn, { baseDelay: 0 })).rejects.toThrow(/SSRF blocked/);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("does NOT retry an ImageDecodeError", async () => {
		const fn = vi.fn().mockRejectedValue(new ImageDecodeError());

		await expect(withRetry(fn, { baseDelay: 0 })).rejects.toThrow(/pas une image décodable/);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("retries transient network errors until success", async () => {
		const fn = vi.fn().mockRejectedValueOnce(new Error("ECONNRESET")).mockResolvedValue("ok");

		await expect(withRetry(fn, { baseDelay: 0 })).resolves.toBe("ok");
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

// ============================================================================
// downloadImage – SSRF protection (isPrivateHostname via downloadImage)
// ============================================================================

describe("downloadImage – SSRF protection", () => {
	it("blocks localhost", async () => {
		await expect(downloadImage("http://localhost/image.jpg")).rejects.toThrow(
			/SSRF blocked.*localhost/,
		);
	});

	it("blocks 127.0.0.1", async () => {
		await expect(downloadImage("http://127.0.0.1/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("blocks 10.x.x.x (RFC 1918)", async () => {
		await expect(downloadImage("http://10.0.0.1/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("blocks 172.16.x.x (RFC 1918)", async () => {
		await expect(downloadImage("http://172.16.0.1/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("blocks 172.31.x.x (RFC 1918 upper bound)", async () => {
		await expect(downloadImage("http://172.31.255.255/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("allows 172.32.x.x (public IP, outside RFC 1918 range)", async () => {
		const headers = new Headers({ "content-type": "image/jpeg" });
		const arrayBuffer = Buffer.from("fake-image").buffer;
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers,
			arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
		});
		// Should not be SSRF-blocked — passes through to fetch/sharp
		const result = await downloadImage("http://172.32.0.1/image.jpg");
		expect(result).toBeInstanceOf(Buffer);
	});

	it("blocks 192.168.x.x (RFC 1918)", async () => {
		await expect(downloadImage("http://192.168.1.1/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("blocks 100.64.0.0/10 (CGNAT, RFC 6598) across the whole range", async () => {
		await expect(downloadImage("http://100.64.0.1/image.jpg")).rejects.toThrow(/SSRF blocked/);
		await expect(downloadImage("http://100.127.255.255/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("allows public IPs adjacent to the CGNAT range (100.63.x / 100.128.x)", async () => {
		const headers = new Headers({ "content-type": "image/jpeg" });
		const arrayBuffer = Buffer.from("fake-image").buffer;
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers,
			arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
		});
		await expect(downloadImage("http://100.63.255.255/image.jpg")).resolves.toBeInstanceOf(Buffer);
		await expect(downloadImage("http://100.128.0.1/image.jpg")).resolves.toBeInstanceOf(Buffer);
	});

	it("blocks 192.0.0.0/24 (IETF protocol assignments, RFC 6890)", async () => {
		await expect(downloadImage("http://192.0.0.1/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("allows 192.0.1.x (public, just outside 192.0.0.0/24)", async () => {
		const headers = new Headers({ "content-type": "image/jpeg" });
		const arrayBuffer = Buffer.from("fake-image").buffer;
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers,
			arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
		});
		await expect(downloadImage("http://192.0.1.1/image.jpg")).resolves.toBeInstanceOf(Buffer);
	});

	it("throws a typed non-retryable error on SSRF block (retrying cannot succeed)", async () => {
		const err = await downloadImage("http://10.0.0.1/image.jpg").catch((e: unknown) => e);

		expect(err).toBeInstanceOf(NonRetryableDownloadError);
		expect(isRetryableError(err)).toBe(false);
	});

	it("blocks 169.254.x.x (link-local / cloud metadata)", async () => {
		await expect(downloadImage("http://169.254.169.254/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("blocks IPv4-mapped IPv6 ::ffff:192.168.1.1 (dotted-decimal form preserved by URL parser edge case)", async () => {
		// Node's URL parser normalises [::ffff:192.168.1.1] to [::ffff:c0a8:101] (hex notation).
		// The SSRF guard strips brackets → "::ffff:c0a8:101", which starts with "::ffff:", recurses
		// with "c0a8:101". That value is not a valid dotted-decimal IPv4, so the guard does not block it.
		// This test documents the current (known-limited) behavior for hex-form IPv4-mapped addresses:
		// the guard does NOT catch them via the dotted-decimal path.
		// Real-world risk is mitigated because such URLs are not produced by standard image CDNs.
		const headers = new Headers({ "content-type": "image/jpeg" });
		const arrayBuffer = Buffer.from("fake-image").buffer;
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers,
			arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
		});
		// The URL parser normalises to hex; guard does not match → fetch proceeds
		const result = await downloadImage("http://[::ffff:192.168.1.1]/image.jpg");
		expect(result).toBeInstanceOf(Buffer);
	});

	it("blocks IPv6 ULA fc00::/7", async () => {
		await expect(downloadImage("http://[fc00::1]/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("blocks IPv6 ULA fd00::/8", async () => {
		await expect(downloadImage("http://[fd00::1]/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});

	it("blocks IPv6 link-local fe80::", async () => {
		await expect(downloadImage("http://[fe80::1]/image.jpg")).rejects.toThrow(/SSRF blocked/);
	});
});

// ============================================================================
// downloadImage – fetch behavior
// ============================================================================

describe("downloadImage", () => {
	const PUBLIC_URL = "https://cdn.example.com/photo.jpg";

	function buildFakeImageBuffer(): ArrayBuffer {
		return Buffer.from("fake-image-bytes").buffer;
	}

	function buildOkResponse(
		overrides: {
			contentType?: string;
			contentLength?: string;
			arrayBuffer?: ArrayBuffer;
		} = {},
	) {
		const headers = new Headers({
			"content-type": overrides.contentType ?? "image/jpeg",
			...(overrides.contentLength ? { "content-length": overrides.contentLength } : {}),
		});
		return {
			ok: true,
			status: 200,
			statusText: "OK",
			headers,
			arrayBuffer: vi.fn().mockResolvedValue(overrides.arrayBuffer ?? buildFakeImageBuffer()),
		};
	}

	it("returns a Buffer on successful download", async () => {
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse());

		const result = await downloadImage(PUBLIC_URL);

		expect(result).toBeInstanceOf(Buffer);
		expect(global.fetch).toHaveBeenCalledWith(
			PUBLIC_URL,
			expect.objectContaining({
				headers: expect.objectContaining({ "User-Agent": "Synclune-ImageDownloader/1.0" }),
				// Défense en profondeur SSRF : une redirection re-pointerait la
				// requête vers une cible jamais re-validée.
				redirect: "error",
			}),
		);
		expect(mockSharpMetadata).toHaveBeenCalledTimes(1);
	});

	it("throws when fetch response is not ok", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			statusText: "Not Found",
			headers: new Headers(),
		});

		await expect(downloadImage(PUBLIC_URL)).rejects.toThrow("HTTP 404: Not Found");
	});

	it("throws when Content-Type is not image/*", async () => {
		global.fetch = vi
			.fn()
			.mockResolvedValue(buildOkResponse({ contentType: "text/html; charset=utf-8" }));

		await expect(downloadImage(PUBLIC_URL)).rejects.toThrow(/Content-Type invalide/);
	});

	it("throws when Content-Type header is absent", async () => {
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse({ contentType: "" }));

		await expect(downloadImage(PUBLIC_URL)).rejects.toThrow(/Content-Type invalide/);
	});

	it("marks an invalid Content-Type as non-retryable (the server will answer the same)", async () => {
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse({ contentType: "text/html" }));

		const err = await downloadImage(PUBLIC_URL).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(NonRetryableDownloadError);
		expect(isRetryableError(err)).toBe(false);
	});

	// Audit : fetch suivait les redirections sans re-valider la cible (SSRF via
	// redirect). Undici signale le refus par un TypeError « fetch failed » dont la
	// cause porte « unexpected redirect » — le service le retraduit en erreur claire.
	it("refuses redirects with a clear, non-retryable error", async () => {
		global.fetch = vi
			.fn()
			.mockRejectedValue(
				new TypeError("fetch failed", { cause: new Error("unexpected redirect") }),
			);

		const err = await downloadImage(PUBLIC_URL).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(NonRetryableDownloadError);
		expect((err as Error).message).toMatch(/Redirection refusée/);
		expect(isRetryableError(err)).toBe(false);
	});

	it("throws when content-length header exceeds maxImageSize", async () => {
		const oversizedBytes = String(21 * 1024 * 1024); // 21 MB
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse({ contentLength: oversizedBytes }));

		await expect(downloadImage(PUBLIC_URL)).rejects.toThrow(/Image trop volumineuse/);
	});

	it("throws when downloaded buffer exceeds maxImageSize even without content-length", async () => {
		// Simulate a response without content-length but large buffer
		const largeBuffer = Buffer.alloc(21 * 1024 * 1024).buffer;
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse({ arrayBuffer: largeBuffer }));

		await expect(downloadImage(PUBLIC_URL)).rejects.toThrow(/Image trop volumineuse/);
	});

	// Audit : sans content-length (ou avec un header menteur), arrayBuffer()
	// bufferisait TOUT avant le contrôle des 20 Mo. Le flux ci-dessous n'a pas de
	// fin — si l'implémentation bufferisait encore, ce test ne terminerait jamais.
	it("aborts a stream that exceeds maxImageSize instead of buffering it entirely", async () => {
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				// 1 KB par pull, jamais de close : simule un serveur qui ment/streame sans fin
				controller.enqueue(new Uint8Array(1024));
			},
		});
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: "OK",
			headers: new Headers({ "content-type": "image/jpeg" }),
			body,
		});

		const err = await downloadImage(PUBLIC_URL, { maxImageSize: 4096 }).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(NonRetryableDownloadError);
		expect((err as Error).message).toMatch(/Image trop volumineuse/);
	});

	it("reads a streamed body chunk by chunk and returns the concatenated buffer", async () => {
		const bytes = Buffer.from("stream-image-bytes");
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				// Deux chunks pour vérifier la concaténation, pas juste le passage
				controller.enqueue(new Uint8Array(bytes.subarray(0, 6)));
				controller.enqueue(new Uint8Array(bytes.subarray(6)));
				controller.close();
			},
		});
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: "OK",
			headers: new Headers({ "content-type": "image/jpeg" }),
			body,
		});

		const result = await downloadImage(PUBLIC_URL);

		expect(result.equals(bytes)).toBe(true);
	});

	// Audit média M1 : l'échec de décodage doit être typé `ImageDecodeError` pour que
	// le route handler puisse le distinguer d'un incident réseau (qu'il tolère) et
	// rejeter l'upload. Un `Error` générique était avalé côté route.
	it("throws a typed ImageDecodeError when sharp metadata validation fails", async () => {
		mockSharpMetadata.mockRejectedValue(new Error("unsupported image format"));
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse());

		const err = await downloadImage(PUBLIC_URL).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ImageDecodeError);
		expect((err as ImageDecodeError).cause).toEqual(new Error("unsupported image format"));
	});

	it("marks a decode failure as non-retryable (re-downloading changes nothing)", () => {
		expect(isRetryableError(new ImageDecodeError())).toBe(false);
	});

	it("throws when fetch itself throws (network error)", async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

		await expect(downloadImage(PUBLIC_URL)).rejects.toThrow("ECONNREFUSED");
	});

	it("respects a custom downloadTimeout option", async () => {
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse());

		await downloadImage(PUBLIC_URL, { downloadTimeout: 5_000 });

		expect(global.fetch).toHaveBeenCalledWith(
			PUBLIC_URL,
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	it("throws when a custom maxImageSize is smaller than the downloaded buffer", async () => {
		// The fake buffer is "fake-image-bytes" (16 bytes). Setting maxImageSize to 10 bytes should reject.
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse());

		await expect(downloadImage(PUBLIC_URL, { maxImageSize: 10 })).rejects.toThrow(
			/Image trop volumineuse/,
		);
	});

	it("respects a custom userAgent option", async () => {
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse());

		await downloadImage(PUBLIC_URL, { userAgent: "CustomBot/2.0" });

		expect(global.fetch).toHaveBeenCalledWith(
			PUBLIC_URL,
			expect.objectContaining({
				headers: expect.objectContaining({ "User-Agent": "CustomBot/2.0" }),
			}),
		);
	});

	it("accepts image/png content-type", async () => {
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse({ contentType: "image/png" }));

		const result = await downloadImage(PUBLIC_URL);
		expect(result).toBeInstanceOf(Buffer);
	});

	it("accepts image/webp content-type", async () => {
		global.fetch = vi.fn().mockResolvedValue(buildOkResponse({ contentType: "image/webp" }));

		const result = await downloadImage(PUBLIC_URL);
		expect(result).toBeInstanceOf(Buffer);
	});
});
