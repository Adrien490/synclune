import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCheckRateLimit, mockGetClientIp, mockHeaders } = vi.hoisted(() => ({
	mockCheckRateLimit: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockHeaders: vi.fn(),
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

import { POST } from "../route";

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(body: unknown): Request {
	return new Request("https://example.com/api/analytics/web-vitals", {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}

function metric(overrides: Record<string, unknown> = {}) {
	return {
		name: "LCP",
		value: 1234,
		rating: "good" as const,
		delta: 12,
		id: "v1-1",
		navigationType: "navigate",
		url: "https://synclune.com/",
		...overrides,
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("POST /api/analytics/web-vitals", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(new Map());
		mockGetClientIp.mockResolvedValue("203.0.113.7");
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 19 });
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	describe("rate limiting", () => {
		it("returns 429 when rate-limit fails", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 });

			const response = await POST(makeRequest([metric()]));

			expect(response.status).toBe(429);
			const body = await response.json();
			expect(body.status).toBe("rate_limited");
		});

		it("uses cwv:ip:<ip> as the rate-limit key", async () => {
			await POST(makeRequest([metric()]));

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"cwv:ip:203.0.113.7",
				expect.objectContaining({ limit: 20, windowMs: 60_000 }),
			);
		});

		it("falls back to cwv:ip:unknown when client IP is null", async () => {
			mockGetClientIp.mockResolvedValue(null);

			await POST(makeRequest([metric()]));

			expect(mockCheckRateLimit).toHaveBeenCalledWith("cwv:ip:unknown", expect.anything());
		});
	});

	describe("payload validation", () => {
		it("returns 400 when payload is not an array", async () => {
			const response = await POST(makeRequest({ not: "an array" }));

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Invalid payload");
		});

		it("returns 400 when more than 25 metrics are sent", async () => {
			const tooMany = Array.from({ length: 26 }, () => metric());

			const response = await POST(makeRequest(tooMany));

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Too many metrics");
		});

		it("accepts up to 25 metrics", async () => {
			const ok = Array.from({ length: 25 }, () => metric());

			const response = await POST(makeRequest(ok));

			expect(response.status).toBe(200);
		});

		it("returns 400 on malformed JSON", async () => {
			const response = await POST(makeRequest("{not json"));

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Invalid JSON");
		});
	});

	describe("logging", () => {
		it("logs each valid metric as structured JSON with type=cwv", async () => {
			await POST(makeRequest([metric({ name: "CLS", value: 0.05 })]));

			expect(consoleSpy).toHaveBeenCalledOnce();
			const logged = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
			expect(logged).toMatchObject({
				type: "cwv",
				name: "CLS",
				value: 0.05,
				rating: "good",
			});
			expect(typeof logged.timestamp).toBe("number");
		});

		it("skips invalid metrics silently and logs only the valid ones", async () => {
			await POST(
				makeRequest([
					metric({ name: "INP" }),
					{ name: "INVALID", value: "not a number" },
					metric({ name: "TTFB" }),
				]),
			);

			expect(consoleSpy).toHaveBeenCalledTimes(2);
		});

		it("returns 200 ok=true on success", async () => {
			const response = await POST(makeRequest([metric()]));

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.ok).toBe(true);
		});
	});
});
