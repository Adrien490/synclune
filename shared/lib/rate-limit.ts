/**
 * Rate limiting with Upstash Redis (production) and in-memory fallback (dev)
 *
 * In production (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set):
 * - Uses Upstash Redis for distributed rate limiting across all Vercel instances
 * - Sliding window algorithm for accurate limiting
 *
 * In development (env vars absent):
 * - Falls back to in-memory Map (same as before)
 * - Works without any external dependencies
 */

import type { RateLimitConfig, RateLimitResult } from "@/shared/types/rate-limit.types"

export type { RateLimitConfig, RateLimitResult } from "@/shared/types/rate-limit.types"

// ============================================================================
// UPSTASH REDIS RATE LIMITER (lazy-initialized)
// ============================================================================

let upstashLimiterCache: Map<string, import("@upstash/ratelimit").Ratelimit> | null = null;
let globalIpLimiter: import("@upstash/ratelimit").Ratelimit | null = null;

function isUpstashConfigured(): boolean {
	return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function getUpstashLimiter(limit: number, windowMs: number): Promise<import("@upstash/ratelimit").Ratelimit> {
	if (!upstashLimiterCache) {
		upstashLimiterCache = new Map();
	}

	const cacheKey = `${limit}:${windowMs}`;
	const cached = upstashLimiterCache.get(cacheKey);
	if (cached) return cached;

	const { Ratelimit } = await import("@upstash/ratelimit");
	const { Redis } = await import("@upstash/redis");

	const redis = new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL!,
		token: process.env.UPSTASH_REDIS_REST_TOKEN!,
	});

	const windowSeconds = Math.ceil(windowMs / 1000);
	const limiter = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
		prefix: "synclune:rl",
	});

	upstashLimiterCache.set(cacheKey, limiter);
	return limiter;
}

async function getGlobalIpLimiter(): Promise<import("@upstash/ratelimit").Ratelimit> {
	if (globalIpLimiter) return globalIpLimiter;

	const { Ratelimit } = await import("@upstash/ratelimit");
	const { Redis } = await import("@upstash/redis");

	const redis = new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL!,
		token: process.env.UPSTASH_REDIS_REST_TOKEN!,
	});

	globalIpLimiter = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(GLOBAL_IP_LIMIT, `${Math.ceil(GLOBAL_IP_WINDOW / 1000)} s`),
		prefix: "synclune:rl:global-ip",
	});

	return globalIpLimiter;
}

// ============================================================================
// IN-MEMORY FALLBACK (dev / missing Upstash config)
// ============================================================================

interface RateLimitEntry {
	count: number
	resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const globalIpLimitStore = new Map<string, RateLimitEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_STORE_SIZE = 10000;

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

const GLOBAL_IP_LIMIT = 100;
const GLOBAL_IP_WINDOW = 60 * 1000; // 1 minute

const WHITELIST_IPS = process.env.RATE_LIMIT_WHITELIST?.split(",").map((ip) => ip.trim()) || [];
const BLACKLIST_IPS = process.env.RATE_LIMIT_BLACKLIST?.split(",").map((ip) => ip.trim()) || [];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Logs structured info when a rate limit is triggered.
 * Enables post-mortem analysis: which endpoints are targeted, which IPs are suspicious.
 */
function logRateLimitBlock(params: {
	type: "global-ip" | "per-action";
	identifier: string;
	ip: string | null;
	limit: number;
	windowMs: number;
	retryAfterSeconds: number;
}): void {
	console.warn("[RATE_LIMIT] Blocked:", {
		type: params.type,
		identifier: params.identifier.startsWith("user:") ? "user:***" : params.identifier,
		ip: params.ip,
		limit: params.limit,
		windowMs: params.windowMs,
		retryAfter: params.retryAfterSeconds,
		timestamp: new Date().toISOString(),
	});
}

function formatRetryAfter(seconds: number): string {
	if (seconds < 60) {
		return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
	}
	const minutes = Math.ceil(seconds / 60);
	return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

function cleanupExpiredEntries(): void {
	const now = Date.now();
	const shouldForceCleanup = rateLimitStore.size > MAX_STORE_SIZE;

	if (!shouldForceCleanup && (now - lastCleanup < CLEANUP_INTERVAL || rateLimitStore.size < 1000)) {
		return;
	}

	lastCleanup = now;

	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetAt < now) {
			rateLimitStore.delete(key);
		}
	}

	if (rateLimitStore.size > MAX_STORE_SIZE) {
		const entries = Array.from(rateLimitStore.entries()).sort(
			(a, b) => a[1].resetAt - b[1].resetAt
		);
		const targetSize = Math.floor(MAX_STORE_SIZE * 0.9);
		const toDelete = entries.slice(0, entries.length - targetSize);
		toDelete.forEach(([key]) => rateLimitStore.delete(key));
	}

	for (const [key, entry] of globalIpLimitStore.entries()) {
		if (entry.resetAt < now) {
			globalIpLimitStore.delete(key);
		}
	}
}

// ============================================================================
// MAIN EXPORTS
// ============================================================================

/**
 * Checks and increments the rate limit counter for an identifier.
 *
 * Uses Upstash Redis when configured (production), falls back to in-memory (dev).
 *
 * Built-in protections:
 * - Whitelist: always-allowed IPs
 * - Blacklist: always-blocked IPs
 * - Global IP limit: DDoS protection (100 req/min per IP across all actions)
 *
 * @param identifier - Rate limit key (e.g. "user:xxx", "ip:1.2.3.4")
 * @param config - Limit and window configuration
 * @param ipAddress - Explicit client IP for global limit check. Required when
 *   identifier is user/session-based, otherwise the global IP limit is bypassed.
 */
export async function checkRateLimit(
	identifier: string,
	config: RateLimitConfig = {},
	ipAddress?: string | null
): Promise<RateLimitResult> {
	const { limit = 10, windowMs = 60000 } = config;
	const now = Date.now();

	// Resolve effective IP: extract from identifier prefix OR use explicit param
	const extractedIp = identifier.startsWith("ip:") ? identifier.substring(3) : null;
	const effectiveIp = extractedIp || ipAddress || null;

	// Whitelist
	if (effectiveIp && WHITELIST_IPS.length > 0 && WHITELIST_IPS.includes(effectiveIp)) {
		return { success: true, remaining: 999, limit: 999, reset: now + windowMs };
	}

	// Blacklist
	if (effectiveIp && BLACKLIST_IPS.length > 0 && BLACKLIST_IPS.includes(effectiveIp)) {
		return {
			success: false,
			remaining: 0,
			limit: 0,
			reset: now + 86400000,
			retryAfter: 86400,
			error: "Accès refusé. Contactez le support si vous pensez qu'il s'agit d'une erreur.",
		};
	}

	// Use Upstash if configured
	if (isUpstashConfigured()) {
		return checkRateLimitUpstash(identifier, effectiveIp, limit, windowMs);
	}

	// Fallback to in-memory
	return checkRateLimitInMemory(identifier, effectiveIp, limit, windowMs);
}

// ============================================================================
// UPSTASH IMPLEMENTATION
// ============================================================================

async function checkRateLimitUpstash(
	identifier: string,
	ipAddress: string | null,
	limit: number,
	windowMs: number
): Promise<RateLimitResult> {
	try {
		// Global IP limit check
		if (ipAddress) {
			const globalLimiter = await getGlobalIpLimiter();
			const globalResult = await globalLimiter.limit(ipAddress);

			if (!globalResult.success) {
				const retryAfterSeconds = Math.ceil((globalResult.reset - Date.now()) / 1000);
				logRateLimitBlock({ type: "global-ip", identifier, ip: ipAddress, limit: GLOBAL_IP_LIMIT, windowMs: GLOBAL_IP_WINDOW, retryAfterSeconds });
				return {
					success: false,
					remaining: 0,
					limit: GLOBAL_IP_LIMIT,
					reset: globalResult.reset,
					retryAfter: retryAfterSeconds,
					error: `Trop de requêtes depuis votre adresse IP. Veuillez réessayer dans ${formatRetryAfter(retryAfterSeconds)}.`,
				};
			}
		}

		// Per-action rate limit
		const limiter = await getUpstashLimiter(limit, windowMs);
		const result = await limiter.limit(identifier);

		const retryAfterSeconds = result.success
			? undefined
			: Math.ceil((result.reset - Date.now()) / 1000);

		if (!result.success) {
			logRateLimitBlock({ type: "per-action", identifier, ip: ipAddress, limit, windowMs, retryAfterSeconds: retryAfterSeconds! });
		}

		return {
			success: result.success,
			remaining: result.remaining,
			limit,
			reset: result.reset,
			retryAfter: retryAfterSeconds,
			error: result.success
				? undefined
				: `Trop de requêtes. Veuillez réessayer dans ${formatRetryAfter(retryAfterSeconds!)}.`,
		};
	} catch (error) {
		// If Upstash fails, fall back to in-memory to avoid blocking requests
		console.error(
			"[RATE_LIMIT] Upstash error, falling back to in-memory:",
			error instanceof Error ? error.message : String(error)
		);
		return checkRateLimitInMemory(identifier, ipAddress, limit, windowMs);
	}
}

// ============================================================================
// IN-MEMORY IMPLEMENTATION
// ============================================================================

function checkRateLimitInMemory(
	identifier: string,
	ipAddress: string | null,
	limit: number,
	windowMs: number
): RateLimitResult {
	const now = Date.now();
	const key = `ratelimit:${identifier}`;

	// Global IP limit
	if (ipAddress) {
		const globalKey = `global:ip:${ipAddress}`;
		let globalEntry = globalIpLimitStore.get(globalKey);

		if (!globalEntry || globalEntry.resetAt < now) {
			globalEntry = { count: 0, resetAt: now + GLOBAL_IP_WINDOW };
		}

		if (globalEntry.count >= GLOBAL_IP_LIMIT) {
			const retryAfterSeconds = Math.ceil((globalEntry.resetAt - now) / 1000);
			logRateLimitBlock({ type: "global-ip", identifier, ip: ipAddress, limit: GLOBAL_IP_LIMIT, windowMs: GLOBAL_IP_WINDOW, retryAfterSeconds });
			return {
				success: false,
				remaining: 0,
				limit: GLOBAL_IP_LIMIT,
				reset: globalEntry.resetAt,
				retryAfter: retryAfterSeconds,
				error: `Trop de requêtes depuis votre adresse IP. Veuillez réessayer dans ${formatRetryAfter(retryAfterSeconds)}.`,
			};
		}

		globalEntry.count++;
		globalIpLimitStore.set(globalKey, globalEntry);
	}

	cleanupExpiredEntries();

	let entry = rateLimitStore.get(key);

	if (!entry || entry.resetAt < now) {
		entry = { count: 0, resetAt: now + windowMs };
	}

	const wouldExceedLimit = entry.count >= limit;

	if (!wouldExceedLimit) {
		entry.count++;
		rateLimitStore.set(key, entry);
	}

	const success = !wouldExceedLimit;
	const remaining = Math.max(0, limit - entry.count);
	const retryAfterSeconds = success ? undefined : Math.ceil((entry.resetAt - now) / 1000);

	if (!success) {
		logRateLimitBlock({ type: "per-action", identifier, ip: ipAddress, limit, windowMs, retryAfterSeconds: retryAfterSeconds! });
	}

	return {
		success,
		remaining,
		limit,
		reset: entry.resetAt,
		retryAfter: retryAfterSeconds,
		error: success
			? undefined
			: `Trop de requêtes. Veuillez réessayer dans ${formatRetryAfter(retryAfterSeconds!)}.`,
	};
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Builds a rate limit identifier from available request info
 */
export function getRateLimitIdentifier(
	userId?: string | null,
	sessionId?: string | null,
	ipAddress?: string | null
): string {
	if (userId) return `user:${userId}`;
	if (sessionId) return `session:${sessionId}`;
	if (ipAddress) return `ip:${ipAddress}`;
	return "anonymous";
}

/**
 * Extracts the real client IP from Next.js headers
 */
export async function getClientIp(
	headers: Awaited<ReturnType<typeof import("next/headers").headers>>
): Promise<string | null> {
	const forwardedFor = headers.get("x-forwarded-for");
	if (forwardedFor) return forwardedFor.split(",")[0].trim();

	const realIp = headers.get("x-real-ip");
	if (realIp) return realIp.trim();

	return null;
}

/**
 * Resets the counter for an identifier (useful for tests)
 */
export function resetRateLimit(identifier: string): void {
	rateLimitStore.delete(`ratelimit:${identifier}`);
}

/**
 * Gets current rate limiting stats for an identifier
 */
export function getRateLimitStatus(
	identifier: string
): { count: number; resetAt: number } | null {
	const entry = rateLimitStore.get(`ratelimit:${identifier}`);
	if (!entry || entry.resetAt < Date.now()) return null;
	return { count: entry.count, resetAt: entry.resetAt };
}
