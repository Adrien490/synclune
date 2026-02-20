import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// MOCK STATE
// Declared at module scope so they persist across resets and can be configured
// per-test. vi.doMock() (not hoisted) is used in beforeEach after resetModules.
// ============================================================================

// Shared mockLimit function that both the global-IP limiter and per-action
// limiter instances call. Tests configure its resolved value per scenario.
const mockLimit = vi.fn();

// ============================================================================
// HELPERS
// ============================================================================

function createMockHeaders(headers: Record<string, string>) {
	return { get: (key: string) => headers[key] ?? null };
}

// ============================================================================
// TESTS
// ============================================================================

describe("rate-limit (Upstash path)", () => {
	beforeEach(() => {
		// Clear call counts before each test
		mockLimit.mockReset();

		// Configure Upstash env vars so the Upstash path is selected
		process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
		process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
		delete process.env.RATE_LIMIT_WHITELIST;
		delete process.env.RATE_LIMIT_BLACKLIST;

		// Reset the module registry so singleton state (sharedRedis, upstashLimiterCache,
		// globalIpLimiter) is cleared between tests. Each test re-imports a fresh module.
		vi.resetModules();

		// vi.doMock() is NOT hoisted, so it works correctly after resetModules.
		// The factory returns stable mock constructors that delegate to mockLimit.
		vi.doMock("@upstash/ratelimit", () => {
			// Use a named function so it can be called with `new`
			function MockRatelimit() {
				return { limit: mockLimit };
			}
			MockRatelimit.slidingWindow = vi.fn().mockReturnValue("sliding-window-config");
			return { Ratelimit: MockRatelimit };
		});

		vi.doMock("@upstash/redis", () => {
			// Use a named function so it can be called with `new`
			function MockRedis(this: { url: string; token: string }, opts: { url: string; token: string }) {
				this.url = opts.url;
				this.token = opts.token;
			}
			return { Redis: MockRedis };
		});
	});

	// --------------------------------------------------------------------------
	// 1. Upstash path is chosen when env vars are set
	// --------------------------------------------------------------------------

	describe("Upstash path selection", () => {
		it("calls Ratelimit limiter when Upstash env vars are configured", async () => {
			mockLimit.mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });

			const { checkRateLimit } = await import("../rate-limit");
			const result = await checkRateLimit("user:abc", { limit: 10, windowMs: 60000 });

			expect(result.success).toBe(true);
			// mockLimit is called by the Upstash path (not the in-memory fallback)
			expect(mockLimit).toHaveBeenCalled();
		});

		it("does NOT call the Upstash limiter when env vars are absent", async () => {
			// Remove env vars so the in-memory fallback is used instead
			delete process.env.UPSTASH_REDIS_REST_URL;
			delete process.env.UPSTASH_REDIS_REST_TOKEN;

			const { checkRateLimit } = await import("../rate-limit");
			await checkRateLimit("user:no-upstash", { limit: 5, windowMs: 60000 });

			// In-memory path never calls the Upstash limiter
			expect(mockLimit).not.toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// 2. Shared Redis singleton
	// --------------------------------------------------------------------------

	describe("shared Redis instance", () => {
		it("creates only one Redis instance even when multiple limiters are requested", async () => {
			mockLimit.mockResolvedValue({ success: true, remaining: 5, reset: Date.now() + 60000 });

			// Capture how many times the Redis constructor is called
			const constructorCalls: unknown[] = [];
			vi.doMock("@upstash/redis", () => {
				function MockRedis(this: object, opts: unknown) {
					constructorCalls.push(opts);
				}
				return { Redis: MockRedis };
			});

			// Re-reset modules so this inner doMock takes effect
			vi.resetModules();
			vi.doMock("@upstash/ratelimit", () => {
				function MockRatelimit() {
					return { limit: mockLimit };
				}
				MockRatelimit.slidingWindow = vi.fn().mockReturnValue("sliding-window-config");
				return { Ratelimit: MockRatelimit };
			});
			vi.doMock("@upstash/redis", () => {
				function MockRedis(this: object, opts: unknown) {
					constructorCalls.push(opts);
				}
				return { Redis: MockRedis };
			});

			const { checkRateLimit } = await import("../rate-limit");

			// First call initialises the global-IP limiter and the first per-action limiter
			await checkRateLimit("ip:1.2.3.4", { limit: 10, windowMs: 60000 });
			// Second call with a different config produces a new per-action cache entry
			await checkRateLimit("ip:1.2.3.4", { limit: 5, windowMs: 30000 });

			// All limiters share one Redis instance
			expect(constructorCalls).toHaveLength(1);
		});
	});

	// --------------------------------------------------------------------------
	// 3. Per-action rate limit via Upstash
	// --------------------------------------------------------------------------

	describe("per-action rate limit", () => {
		it("returns success: true with correct shape when limiter allows the request", async () => {
			const reset = Date.now() + 60000;
			// user: identifier has no IP so no global-IP limiter call → one call total
			mockLimit.mockResolvedValue({ success: true, remaining: 8, reset });

			const { checkRateLimit } = await import("../rate-limit");
			const result = await checkRateLimit("user:xyz", { limit: 10, windowMs: 60000 });

			expect(result.success).toBe(true);
			expect(result.remaining).toBe(8);
			expect(result.limit).toBe(10);
			expect(result.reset).toBe(reset);
			expect(result.error).toBeUndefined();
			expect(result.retryAfter).toBeUndefined();
		});

		it("returns success: false with error message when limiter blocks the request", async () => {
			const reset = Date.now() + 45000;
			// Per-action limiter blocks (no IP → no global check)
			mockLimit.mockResolvedValue({ success: false, remaining: 0, reset });

			const { checkRateLimit } = await import("../rate-limit");
			const result = await checkRateLimit("user:xyz", { limit: 10, windowMs: 60000 });

			expect(result.success).toBe(false);
			expect(result.remaining).toBe(0);
			expect(result.error).toBeDefined();
			expect(result.retryAfter).toBeGreaterThan(0);
		});

		it("passes the identifier to limiter.limit()", async () => {
			// session: identifier → no IP extracted → no global check → one call
			mockLimit.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 60000 });

			const { checkRateLimit } = await import("../rate-limit");
			await checkRateLimit("session:sess-123", { limit: 5, windowMs: 60000 });

			// The per-action limiter receives the full identifier
			expect(mockLimit).toHaveBeenCalledWith("session:sess-123");
		});
	});

	// --------------------------------------------------------------------------
	// 4. Global IP limit via Upstash
	// --------------------------------------------------------------------------

	describe("global IP limit", () => {
		it("blocks the request when the global IP limiter denies it, before checking per-action", async () => {
			const reset = Date.now() + 30000;

			// First call → global IP limiter → deny.
			// Per-action limiter should never be reached.
			mockLimit
				.mockResolvedValueOnce({ success: false, remaining: 0, reset })
				.mockResolvedValue({ success: true, remaining: 5, reset: Date.now() + 60000 });

			const { checkRateLimit } = await import("../rate-limit");
			const result = await checkRateLimit("ip:9.9.9.9", { limit: 100, windowMs: 60000 });

			expect(result.success).toBe(false);
			expect(result.error).toContain("adresse IP");
			// Only the global limiter was called
			expect(mockLimit).toHaveBeenCalledTimes(1);
		});

		it("proceeds to per-action check when global IP limiter allows the request", async () => {
			const reset = Date.now() + 60000;
			// Both global-IP call and per-action call succeed
			mockLimit.mockResolvedValue({ success: true, remaining: 9, reset });

			const { checkRateLimit } = await import("../rate-limit");
			const result = await checkRateLimit("ip:8.8.8.8", { limit: 10, windowMs: 60000 });

			expect(result.success).toBe(true);
			// Global limiter first, then per-action limiter
			expect(mockLimit).toHaveBeenCalledTimes(2);
		});

		it("skips the global IP limit when no IP is resolvable", async () => {
			// Only the per-action limiter call should occur
			mockLimit.mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });

			const { checkRateLimit } = await import("../rate-limit");
			// No ip: prefix, no explicit ipAddress → effective IP is null
			await checkRateLimit("anonymous", { limit: 10, windowMs: 60000 });

			// Only one call: the per-action limiter
			expect(mockLimit).toHaveBeenCalledTimes(1);
		});

		it("applies global IP limit when explicit ipAddress is provided with a user: identifier", async () => {
			const reset = Date.now() + 60000;
			mockLimit.mockResolvedValue({ success: true, remaining: 9, reset });

			const { checkRateLimit } = await import("../rate-limit");
			await checkRateLimit("user:u1", { limit: 10, windowMs: 60000 }, "1.1.1.1");

			// Global-IP limiter called with the explicit IP, then per-action called with the identifier
			expect(mockLimit).toHaveBeenCalledTimes(2);
			expect(mockLimit).toHaveBeenNthCalledWith(1, "1.1.1.1");
			expect(mockLimit).toHaveBeenNthCalledWith(2, "user:u1");
		});
	});

	// --------------------------------------------------------------------------
	// 5. Fallback to in-memory on Upstash error
	// --------------------------------------------------------------------------

	describe("Upstash error fallback", () => {
		it("falls back to in-memory and logs an error when the Upstash limiter throws", async () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			// Both the global-IP limiter and per-action limiter throw (no IP on user: identifier
			// so only per-action limiter throws in this case)
			mockLimit.mockRejectedValue(new Error("Redis connection refused"));

			const { checkRateLimit } = await import("../rate-limit");
			const result = await checkRateLimit("user:fallback-user", { limit: 5, windowMs: 60000 });

			// The in-memory fallback allows the first request
			expect(result.success).toBe(true);

			// The Upstash error must have been logged
			expect(errorSpy).toHaveBeenCalledWith(
				"[RATE_LIMIT] Upstash error, falling back to in-memory:",
				expect.any(String)
			);

			errorSpy.mockRestore();
		});

		it("in-memory fallback enforces limits correctly after an Upstash error", async () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			mockLimit.mockRejectedValue(new Error("Timeout"));

			const { checkRateLimit } = await import("../rate-limit");

			const config = { limit: 2, windowMs: 60000 };
			const id = "user:fallback-exhaust";

			const r1 = await checkRateLimit(id, config);
			const r2 = await checkRateLimit(id, config);
			const r3 = await checkRateLimit(id, config);

			// In-memory allows up to limit, then blocks
			expect(r1.success).toBe(true);
			expect(r2.success).toBe(true);
			expect(r3.success).toBe(false);

			errorSpy.mockRestore();
		});
	});
});

// ============================================================================
// getClientIp tests
// These test a pure extraction function - no module-level singletons involved.
// Import once without resetting modules.
// ============================================================================

describe("getClientIp", () => {
	it("returns the first IP from a multi-value x-forwarded-for header", async () => {
		const { getClientIp } = await import("../rate-limit");
		const headers = createMockHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
		const ip = await getClientIp(headers as Parameters<typeof getClientIp>[0]);
		expect(ip).toBe("1.2.3.4");
	});

	it("trims whitespace from the extracted x-forwarded-for IP", async () => {
		const { getClientIp } = await import("../rate-limit");
		const headers = createMockHeaders({ "x-forwarded-for": "  1.2.3.4  " });
		const ip = await getClientIp(headers as Parameters<typeof getClientIp>[0]);
		expect(ip).toBe("1.2.3.4");
	});

	it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
		const { getClientIp } = await import("../rate-limit");
		const headers = createMockHeaders({ "x-real-ip": "10.0.0.1" });
		const ip = await getClientIp(headers as Parameters<typeof getClientIp>[0]);
		expect(ip).toBe("10.0.0.1");
	});

	it("trims whitespace from x-real-ip value", async () => {
		const { getClientIp } = await import("../rate-limit");
		const headers = createMockHeaders({ "x-real-ip": "  10.0.0.2  " });
		const ip = await getClientIp(headers as Parameters<typeof getClientIp>[0]);
		expect(ip).toBe("10.0.0.2");
	});

	it("returns null when neither header is present", async () => {
		const { getClientIp } = await import("../rate-limit");
		const headers = createMockHeaders({});
		const ip = await getClientIp(headers as Parameters<typeof getClientIp>[0]);
		expect(ip).toBeNull();
	});

	it("prefers x-forwarded-for over x-real-ip when both are present", async () => {
		const { getClientIp } = await import("../rate-limit");
		const headers = createMockHeaders({
			"x-forwarded-for": "2.2.2.2",
			"x-real-ip": "3.3.3.3",
		});
		const ip = await getClientIp(headers as Parameters<typeof getClientIp>[0]);
		expect(ip).toBe("2.2.2.2");
	});
});
