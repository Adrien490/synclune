import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockLogger } = vi.hoisted(() => ({
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import {
	checkRateLimit,
	getClientIp,
	getRateLimitIdentifier,
	resetRateLimit,
	getRateLimitStatus,
} from "../rate-limit";
import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

beforeEach(() => {
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
		// Reset stores between tests by resetting known (preset, identifier) pairs
		resetRateLimit("test", "ip:10.0.0.1");
		resetRateLimit("test", "user:test-user");
		resetRateLimit("test", "test-id");
	});

	it("allows requests under the limit", async () => {
		const result = await checkRateLimit("test-id", { name: "test", limit: 3, windowMs: 60000 });
		expect(result.success).toBe(true);
		expect(result.remaining).toBe(2);
		expect(result.limit).toBe(3);
		expect(result.error).toBeUndefined();
		expect(result.retryAfter).toBeUndefined();
	});

	it("blocks requests after exceeding the limit", async () => {
		const config = { name: "test", limit: 2, windowMs: 60000 };
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
		const config = { name: "test", limit: 3, windowMs: 60000 };
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

	it("uses default limit/window when the preset only carries a name", async () => {
		// `config` n'est plus optionnel (le `name` est requis pour que la clé du
		// compteur soit isolée par preset), mais `limit` et `windowMs` gardent
		// leurs valeurs par défaut.
		const result = await checkRateLimit("ip:10.0.0.101", { name: "defaults-only" });
		expect(result.success).toBe(true);
		expect(result.limit).toBe(10); // default
	});

	// KI-004 : deux presets distincts sur le MÊME identifiant avaient un compteur
	// commun, si bien que la limite effective de chacun était le minimum en présence.
	// Concrètement, quelques consultations de fiche produit suffisaient à faire
	// répondre 429 au formulaire de connexion.
	it("isole les compteurs de deux presets partageant un identifiant", async () => {
		const id = "ip:10.0.0.102";
		const browsing = { name: "product-cookie-action", limit: 30, windowMs: 60000 };
		const login = { name: "auth-login", limit: 5, windowMs: 900000 };

		// Épuise largement le budget « navigation » (au-delà de la limite du login).
		for (let i = 0; i < 8; i++) {
			await checkRateLimit(id, browsing);
		}

		// Le login doit disposer de son budget PLEIN, pas du reliquat du voisin.
		const attempt = await checkRateLimit(id, login);
		expect(attempt.success).toBe(true);
		expect(attempt.limit).toBe(5);
		expect(attempt.remaining).toBe(4);
	});

	// Corollaire : la fenêtre appartenait à la première entrée créée. Un preset à
	// fenêtre longue posé en premier gelait donc les voisins pour toute sa durée.
	it("n'hérite pas de la fenêtre d'un autre preset", async () => {
		const id = "ip:10.0.0.103";
		await checkRateLimit(id, { name: "long-window", limit: 1, windowMs: 3_600_000 });

		const short = await checkRateLimit(id, { name: "short-window", limit: 1, windowMs: 60_000 });

		expect(short.success).toBe(true);
		expect(short.reset - Date.now()).toBeLessThanOrEqual(60_000);
	});
});

describe("checkRateLimit - global IP limit", () => {
	it("enforces global IP limit for ip: identifier", async () => {
		const config = { name: "test", limit: 200, windowMs: 60000 }; // High per-action limit
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
		const config = { name: "test", limit: 200, windowMs: 60000 };
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
		const config = { name: "test", limit: 200, windowMs: 60000 };

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
		const result = await checkRateLimit("ip:1.2.3.4", { name: "test", limit: 5, windowMs: 60000 });
		expect(result.success).toBe(true);
	});

	it("uses explicit ipAddress when identifier has no ip: prefix", async () => {
		const config = { name: "test", limit: 200, windowMs: 60000 };
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
		const result = await checkRateLimit(
			"ip:5.5.5.5",
			{ name: "test", limit: 5, windowMs: 60000 },
			"9.9.9.9",
		);
		expect(result.success).toBe(true);
	});
});

describe("checkRateLimit - whitelist/blacklist", () => {
	it("allows whitelisted IPs without counting", async () => {
		vi.resetModules();
		process.env.RATE_LIMIT_WHITELIST = "10.0.0.200";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");

		const result = await freshCheck("ip:10.0.0.200", { name: "test", limit: 1, windowMs: 60000 });
		expect(result.success).toBe(true);
		expect(result.remaining).toBe(999);

		delete process.env.RATE_LIMIT_WHITELIST;
	});

	it("blocks blacklisted IPs with 24h ban", async () => {
		vi.resetModules();
		process.env.RATE_LIMIT_BLACKLIST = "10.0.0.201";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");

		const result = await freshCheck("ip:10.0.0.201", { name: "test", limit: 100, windowMs: 60000 });
		expect(result.success).toBe(false);
		expect(result.retryAfter).toBe(86400);
		expect(result.error).toContain("Accès refusé");

		delete process.env.RATE_LIMIT_BLACKLIST;
	});

	it("applies whitelist via explicit ipAddress for user identifier", async () => {
		vi.resetModules();
		process.env.RATE_LIMIT_WHITELIST = "10.0.0.202";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");

		const result = await freshCheck(
			"user:some-user",
			{ name: "test", limit: 1, windowMs: 60000 },
			"10.0.0.202",
		);
		expect(result.success).toBe(true);
		expect(result.remaining).toBe(999);

		delete process.env.RATE_LIMIT_WHITELIST;
	});

	it("applies blacklist via explicit ipAddress for user identifier", async () => {
		vi.resetModules();
		process.env.RATE_LIMIT_BLACKLIST = "10.0.0.203";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");

		const result = await freshCheck(
			"user:some-user",
			{ name: "test", limit: 100, windowMs: 60000 },
			"10.0.0.203",
		);
		expect(result.success).toBe(false);
		expect(result.error).toContain("Accès refusé");

		delete process.env.RATE_LIMIT_BLACKLIST;
	});
});

describe("resetRateLimit", () => {
	it("resets the counter for an identifier", async () => {
		const id = "ip:10.0.0.70";
		const config = { name: "test", limit: 2, windowMs: 60000 };

		await checkRateLimit(id, config);
		await checkRateLimit(id, config);

		// Should be at limit
		const blocked = await checkRateLimit(id, config);
		expect(blocked.success).toBe(false);

		// Reset and try again
		resetRateLimit("test", id);
		const afterReset = await checkRateLimit(id, config);
		expect(afterReset.success).toBe(true);
	});

	it("ne remet à zéro que le preset ciblé", async () => {
		const id = "ip:10.0.0.72";
		const a = { name: "preset-a", limit: 1, windowMs: 60000 };
		const b = { name: "preset-b", limit: 1, windowMs: 60000 };

		await checkRateLimit(id, a);
		await checkRateLimit(id, b);

		resetRateLimit("preset-a", id);

		expect((await checkRateLimit(id, a)).success).toBe(true);
		expect((await checkRateLimit(id, b)).success).toBe(false);
	});
});

describe("getRateLimitStatus", () => {
	it("returns null for unknown identifier", () => {
		expect(getRateLimitStatus("test", "nonexistent")).toBeNull();
	});

	it("returns count and resetAt for active identifier", async () => {
		const id = "ip:10.0.0.71";
		await checkRateLimit(id, { name: "test", limit: 5, windowMs: 60000 });

		const status = getRateLimitStatus("test", id);
		expect(status).not.toBeNull();
		expect(status!.count).toBe(1);
		expect(status!.resetAt).toBeGreaterThan(Date.now());
	});

	it("ne voit pas l'entrée d'un autre preset sur le même identifiant", async () => {
		const id = "ip:10.0.0.73";
		await checkRateLimit(id, { name: "preset-c", limit: 5, windowMs: 60000 });

		expect(getRateLimitStatus("preset-d", id)).toBeNull();
	});
});

describe("getClientIp - Vercel-first priority", () => {
	function makeHeaders(entries: Record<string, string>): ReadonlyHeaders {
		return new Headers(entries) as unknown as ReadonlyHeaders;
	}

	it("prioritizes x-vercel-forwarded-for over x-real-ip and x-forwarded-for", async () => {
		const headers = makeHeaders({
			"x-vercel-forwarded-for": "203.0.113.10",
			"x-real-ip": "10.0.0.1",
			"x-forwarded-for": "1.2.3.4",
		});
		expect(await getClientIp(headers)).toBe("203.0.113.10");
	});

	it("falls back to x-real-ip when x-vercel-forwarded-for is absent", async () => {
		const headers = makeHeaders({
			"x-real-ip": "10.0.0.1",
			"x-forwarded-for": "1.2.3.4",
		});
		expect(await getClientIp(headers)).toBe("10.0.0.1");
	});

	it("falls back to x-forwarded-for when both Vercel headers are absent", async () => {
		const headers = makeHeaders({ "x-forwarded-for": "1.2.3.4" });
		expect(await getClientIp(headers)).toBe("1.2.3.4");
	});

	it("takes the first IP in a comma-separated x-vercel-forwarded-for chain", async () => {
		const headers = makeHeaders({
			"x-vercel-forwarded-for": "203.0.113.10, 1.2.3.4, 5.6.7.8",
		});
		expect(await getClientIp(headers)).toBe("203.0.113.10");
	});

	it("returns null when no relevant header is present", async () => {
		const headers = makeHeaders({});
		expect(await getClientIp(headers)).toBeNull();
	});

	it("trims whitespace around the extracted IP", async () => {
		const headers = makeHeaders({ "x-vercel-forwarded-for": "  203.0.113.10  " });
		expect(await getClientIp(headers)).toBe("203.0.113.10");
	});

	it("ignores a spoofed x-forwarded-for when x-vercel-forwarded-for is present", async () => {
		// Vercel adds x-vercel-forwarded-for at the edge (non-spoofable).
		// A client-spoofed x-forwarded-for must NOT take precedence.
		const headers = makeHeaders({
			"x-vercel-forwarded-for": "203.0.113.99",
			"x-forwarded-for": "1.1.1.1",
		});
		expect(await getClientIp(headers)).toBe("203.0.113.99");
	});
});

describe("checkRateLimit - structured logging", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("logs when per-action rate limit is triggered", async () => {
		const config = { name: "test", limit: 1, windowMs: 60000 };
		const id = "ip:10.0.0.80";

		await checkRateLimit(id, config);
		const blocked = await checkRateLimit(id, config);

		expect(blocked.success).toBe(false);
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Blocked:"), {
			service: "rate-limit",
		});
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("type=per-action"), {
			service: "rate-limit",
		});
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("ip=10.0.0.80"), {
			service: "rate-limit",
		});
	});

	it("redacts user identifiers in logs", async () => {
		const config = { name: "test", limit: 1, windowMs: 60000 };

		await checkRateLimit("user:secret-id", config, "10.0.0.81");
		const blocked = await checkRateLimit("user:secret-id", config, "10.0.0.81");

		expect(blocked.success).toBe(false);
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("identifier=user:***"), {
			service: "rate-limit",
		});
	});

	it("redacts guest session identifiers in logs", async () => {
		// `session:<uuid>` est la valeur exacte du cookie bearer cart_session /
		// wishlist_session : logguée en clair, la rejouer donne le panier et les
		// favoris de l'invité.
		const config = { name: "test", limit: 1, windowMs: 60000 };
		const sessionId = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

		await checkRateLimit(`session:${sessionId}`, config, "10.0.0.83");
		const blocked = await checkRateLimit(`session:${sessionId}`, config, "10.0.0.83");

		expect(blocked.success).toBe(false);
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("identifier=session:***"),
			{ service: "rate-limit" },
		);
		const warnMessages = mockLogger.warn.mock.calls.map((call) => String(call[0]));
		expect(warnMessages.some((message) => message.includes(sessionId))).toBe(false);
	});

	it("logs when global IP limit is triggered", async () => {
		const config = { name: "test", limit: 200, windowMs: 60000 };
		const ip = "10.0.0.82";

		// Exhaust global limit
		for (let i = 0; i < 100; i++) {
			await checkRateLimit(`ip:${ip}`, config);
		}
		await checkRateLimit(`ip:${ip}`, config);

		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("type=global-ip"), {
			service: "rate-limit",
		});
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(`ip=${ip}`), {
			service: "rate-limit",
		});
	});
});
