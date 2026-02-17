import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	checkRateLimit,
	getRateLimitIdentifier,
	resetRateLimit,
	getRateLimitStatus,
} from "../rate-limit";

// Ensure Upstash is not configured so in-memory path is used
beforeEach(() => {
	delete process.env.UPSTASH_REDIS_REST_URL;
	delete process.env.UPSTASH_REDIS_REST_TOKEN;
	delete process.env.RATE_LIMIT_WHITELIST;
	delete process.env.RATE_LIMIT_BLACKLIST;
});

describe("getRateLimitIdentifier", () => {
	it("returns user identifier when userId is present", () => {
		expect(getRateLimitIdentifier("u123", "s456", "1.2.3.4")).toBe("user:u123");
	});

	it("returns session identifier when no userId", () => {
		expect(getRateLimitIdentifier(null, "s456", "1.2.3.4")).toBe("session:s456");
	});

	it("returns ip identifier when no userId and no sessionId", () => {
		expect(getRateLimitIdentifier(null, null, "1.2.3.4")).toBe("ip:1.2.3.4");
	});

	it("returns anonymous when all are null", () => {
		expect(getRateLimitIdentifier(null, null, null)).toBe("anonymous");
	});

	it("prioritizes userId over sessionId and ipAddress", () => {
		expect(getRateLimitIdentifier("u1", "s1", "1.1.1.1")).toBe("user:u1");
	});
});

describe("checkRateLimit (in-memory)", () => {
	beforeEach(() => {
		// Reset stores between tests by resetting known identifiers
		resetRateLimit("ip:10.0.0.1");
		resetRateLimit("user:test-user");
		resetRateLimit("test-id");
	});

	it("allows requests under the limit", async () => {
		const result = await checkRateLimit("test-id", { limit: 3, windowMs: 60000 });
		expect(result.success).toBe(true);
		expect(result.remaining).toBe(2);
		expect(result.limit).toBe(3);
		expect(result.error).toBeUndefined();
		expect(result.retryAfter).toBeUndefined();
	});

	it("blocks requests after exceeding the limit", async () => {
		const config = { limit: 2, windowMs: 60000 };
		const id = "ip:10.0.0.99";

		await checkRateLimit(id, config);
		await checkRateLimit(id, config);
		const third = await checkRateLimit(id, config);

		expect(third.success).toBe(false);
		expect(third.remaining).toBe(0);
		expect(third.error).toBeDefined();
		expect(third.retryAfter).toBeGreaterThan(0);
	});

	it("tracks remaining correctly", async () => {
		const config = { limit: 3, windowMs: 60000 };
		const id = "ip:10.0.0.100";

		const r1 = await checkRateLimit(id, config);
		expect(r1.remaining).toBe(2);

		const r2 = await checkRateLimit(id, config);
		expect(r2.remaining).toBe(1);

		const r3 = await checkRateLimit(id, config);
		expect(r3.remaining).toBe(0);
		expect(r3.success).toBe(true);

		// Now blocked
		const r4 = await checkRateLimit(id, config);
		expect(r4.success).toBe(false);
	});

	it("uses default config when none provided", async () => {
		const result = await checkRateLimit("ip:10.0.0.101");
		expect(result.success).toBe(true);
		expect(result.limit).toBe(10); // default
	});
});

describe("checkRateLimit - global IP limit", () => {
	it("enforces global IP limit for ip: identifier", async () => {
		const config = { limit: 200, windowMs: 60000 }; // High per-action limit
		const ip = "10.0.0.50";

		// Exhaust global IP limit (100 requests)
		for (let i = 0; i < 100; i++) {
			const r = await checkRateLimit(`ip:${ip}`, config);
			expect(r.success).toBe(true);
		}

		// 101st should be blocked by global IP limit
		const blocked = await checkRateLimit(`ip:${ip}`, config);
		expect(blocked.success).toBe(false);
		expect(blocked.error).toContain("adresse IP");
	});

	it("enforces global IP limit for user: identifier with explicit ipAddress", async () => {
		const config = { limit: 200, windowMs: 60000 };
		const ip = "10.0.0.51";

		// Exhaust global IP limit using user identifier + explicit IP
		for (let i = 0; i < 100; i++) {
			const r = await checkRateLimit(`user:user-${i % 5}`, config, ip);
			expect(r.success).toBe(true);
		}

		// 101st should be blocked by global IP limit
		const blocked = await checkRateLimit("user:any-user", config, ip);
		expect(blocked.success).toBe(false);
		expect(blocked.error).toContain("adresse IP");
	});

	it("skips global IP limit when no IP is available", async () => {
		const config = { limit: 200, windowMs: 60000 };

		// Without IP, global limit doesn't apply - only per-action limit
		for (let i = 0; i < 150; i++) {
			const r = await checkRateLimit(`user:no-ip-user`, config);
			if (i < 200) {
				expect(r.success).toBe(true);
			}
		}
	});
});

describe("checkRateLimit - ipAddress parameter", () => {
	it("extracts IP from ip: identifier prefix", async () => {
		const result = await checkRateLimit("ip:1.2.3.4", { limit: 5, windowMs: 60000 });
		expect(result.success).toBe(true);
	});

	it("uses explicit ipAddress when identifier has no ip: prefix", async () => {
		const config = { limit: 200, windowMs: 60000 };
		const ip = "10.0.0.60";

		// This should count toward global IP limit via explicit ipAddress
		for (let i = 0; i < 100; i++) {
			await checkRateLimit("session:some-session", config, ip);
		}

		// Global IP limit should be hit
		const blocked = await checkRateLimit("session:some-session", config, ip);
		expect(blocked.success).toBe(false);
		expect(blocked.error).toContain("adresse IP");
	});

	it("prefers extracted IP from identifier over explicit ipAddress", async () => {
		// When identifier has ip: prefix, that IP is used for global check
		// The explicit ipAddress is only a fallback
		const result = await checkRateLimit("ip:5.5.5.5", { limit: 5, windowMs: 60000 }, "9.9.9.9");
		expect(result.success).toBe(true);
	});
});

describe("checkRateLimit - whitelist/blacklist", () => {
	it("allows whitelisted IPs without counting", async () => {
		vi.resetModules();
		process.env.RATE_LIMIT_WHITELIST = "10.0.0.200";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");

		const result = await freshCheck("ip:10.0.0.200", { limit: 1, windowMs: 60000 });
		expect(result.success).toBe(true);
		expect(result.remaining).toBe(999);

		delete process.env.RATE_LIMIT_WHITELIST;
	});

	it("blocks blacklisted IPs with 24h ban", async () => {
		vi.resetModules();
		process.env.RATE_LIMIT_BLACKLIST = "10.0.0.201";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");

		const result = await freshCheck("ip:10.0.0.201", { limit: 100, windowMs: 60000 });
		expect(result.success).toBe(false);
		expect(result.retryAfter).toBe(86400);
		expect(result.error).toContain("Accès refusé");

		delete process.env.RATE_LIMIT_BLACKLIST;
	});

	it("applies whitelist via explicit ipAddress for user identifier", async () => {
		vi.resetModules();
		process.env.RATE_LIMIT_WHITELIST = "10.0.0.202";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");

		const result = await freshCheck("user:some-user", { limit: 1, windowMs: 60000 }, "10.0.0.202");
		expect(result.success).toBe(true);
		expect(result.remaining).toBe(999);

		delete process.env.RATE_LIMIT_WHITELIST;
	});

	it("applies blacklist via explicit ipAddress for user identifier", async () => {
		vi.resetModules();
		process.env.RATE_LIMIT_BLACKLIST = "10.0.0.203";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");

		const result = await freshCheck("user:some-user", { limit: 100, windowMs: 60000 }, "10.0.0.203");
		expect(result.success).toBe(false);
		expect(result.error).toContain("Accès refusé");

		delete process.env.RATE_LIMIT_BLACKLIST;
	});
});

describe("resetRateLimit", () => {
	it("resets the counter for an identifier", async () => {
		const id = "ip:10.0.0.70";
		const config = { limit: 2, windowMs: 60000 };

		await checkRateLimit(id, config);
		await checkRateLimit(id, config);

		// Should be at limit
		const blocked = await checkRateLimit(id, config);
		expect(blocked.success).toBe(false);

		// Reset and try again
		resetRateLimit(id);
		const afterReset = await checkRateLimit(id, config);
		expect(afterReset.success).toBe(true);
	});
});

describe("getRateLimitStatus", () => {
	it("returns null for unknown identifier", () => {
		expect(getRateLimitStatus("nonexistent")).toBeNull();
	});

	it("returns count and resetAt for active identifier", async () => {
		const id = "ip:10.0.0.71";
		await checkRateLimit(id, { limit: 5, windowMs: 60000 });

		const status = getRateLimitStatus(id);
		expect(status).not.toBeNull();
		expect(status!.count).toBe(1);
		expect(status!.resetAt).toBeGreaterThan(Date.now());
	});
});

describe("checkRateLimit - structured logging", () => {
	it("logs when per-action rate limit is triggered", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const config = { limit: 1, windowMs: 60000 };
		const id = "ip:10.0.0.80";

		await checkRateLimit(id, config);
		const blocked = await checkRateLimit(id, config);

		expect(blocked.success).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(
			"[RATE_LIMIT] Blocked:",
			expect.objectContaining({
				type: "per-action",
				identifier: id,
				ip: "10.0.0.80",
			})
		);

		warnSpy.mockRestore();
	});

	it("redacts user identifiers in logs", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const config = { limit: 1, windowMs: 60000 };

		await checkRateLimit("user:secret-id", config, "10.0.0.81");
		const blocked = await checkRateLimit("user:secret-id", config, "10.0.0.81");

		expect(blocked.success).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(
			"[RATE_LIMIT] Blocked:",
			expect.objectContaining({
				identifier: "user:***",
			})
		);

		warnSpy.mockRestore();
	});

	it("logs when global IP limit is triggered", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const config = { limit: 200, windowMs: 60000 };
		const ip = "10.0.0.82";

		// Exhaust global limit
		for (let i = 0; i < 100; i++) {
			await checkRateLimit(`ip:${ip}`, config);
		}
		await checkRateLimit(`ip:${ip}`, config);

		expect(warnSpy).toHaveBeenCalledWith(
			"[RATE_LIMIT] Blocked:",
			expect.objectContaining({
				type: "global-ip",
				ip,
			})
		);

		warnSpy.mockRestore();
	});
});
