import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCheckRateLimit, mockGetClientIp, mockHeaders, mockLoggerWarn } = vi.hoisted(() => ({
	mockCheckRateLimit: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockHeaders: vi.fn(),
	mockLoggerWarn: vi.fn(),
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { warn: mockLoggerWarn },
}));

import { POST } from "../route";

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(body: unknown): Request {
	return new Request("https://example.com/api/csp-report", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}

// ============================================================================
// Tests
// ============================================================================

describe("POST /api/csp-report", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(new Map());
		mockGetClientIp.mockResolvedValue("203.0.113.42");
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 19 });
	});

	describe("rate limiting", () => {
		it("returns 429 when rate limit exceeded", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 });

			const response = await POST(makeRequest({ "csp-report": {} }));

			expect(response.status).toBe(429);
			const body = await response.json();
			expect(body.status).toBe("rate_limited");
		});

		it("sets Retry-After header when rate limited", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0, retryAfter: 42 });

			const response = await POST(makeRequest({ "csp-report": {} }));

			expect(response.status).toBe(429);
			expect(response.headers.get("Retry-After")).toBe("42");
		});

		it("falls back to Retry-After: 60 when retryAfter not provided", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 });

			const response = await POST(makeRequest({ "csp-report": {} }));

			expect(response.headers.get("Retry-After")).toBe("60");
		});

		it("uses ip:<ip> as the rate-limit key", async () => {
			await POST(makeRequest({ "csp-report": {} }));

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"ip:203.0.113.42",
				expect.objectContaining({ limit: 20, windowMs: 60_000 }),
			);
		});

		it("falls back to ip:unknown when client IP is null", async () => {
			mockGetClientIp.mockResolvedValue(null);

			await POST(makeRequest({ "csp-report": {} }));

			expect(mockCheckRateLimit).toHaveBeenCalledWith("ip:unknown", expect.anything());
		});

		it("does not log when rate limited", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 });

			await POST(makeRequest({ "csp-report": {} }));

			expect(mockLoggerWarn).not.toHaveBeenCalled();
		});
	});

	describe("CSP report logging", () => {
		it("returns 204 with empty body on valid csp-report payload", async () => {
			const response = await POST(
				makeRequest({
					"csp-report": {
						"blocked-uri": "https://evil.example.com/script.js",
						"violated-directive": "script-src",
						"document-uri": "https://synclune.com/page",
					},
				}),
			);

			expect(response.status).toBe(204);
		});

		it("logs the violation with structured fields", async () => {
			await POST(
				makeRequest({
					"csp-report": {
						"blocked-uri": "https://evil.example.com/script.js",
						"violated-directive": "script-src",
						"document-uri": "https://synclune.com/page",
					},
				}),
			);

			expect(mockLoggerWarn).toHaveBeenCalledWith(
				"CSP violation detected",
				expect.objectContaining({
					service: "csp",
					blockedUri: "https://evil.example.com/script.js",
					violatedDirective: "script-src",
					documentUri: "https://synclune.com/page",
				}),
			);
		});

		it("supports payloads without the 'csp-report' wrapper", async () => {
			await POST(
				makeRequest({
					"blocked-uri": "https://evil.example.com",
					"violated-directive": "img-src",
				}),
			);

			expect(mockLoggerWarn).toHaveBeenCalledWith(
				"CSP violation detected",
				expect.objectContaining({
					blockedUri: "https://evil.example.com",
					violatedDirective: "img-src",
				}),
			);
		});

		it("logs with undefined fields when fields are missing", async () => {
			await POST(makeRequest({ "csp-report": {} }));

			expect(mockLoggerWarn).toHaveBeenCalledWith(
				"CSP violation detected",
				expect.objectContaining({
					blockedUri: undefined,
					violatedDirective: undefined,
					documentUri: undefined,
				}),
			);
		});
	});

	describe("error handling", () => {
		it("returns 400 on malformed JSON", async () => {
			const malformed = new Request("https://example.com/api/csp-report", {
				method: "POST",
				body: "{not json",
				headers: { "Content-Type": "application/json" },
			});

			const response = await POST(malformed);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.status).toBe("error");
		});
	});
});
