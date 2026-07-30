/**
 * In-memory rate limiting
 *
 * Algorithme: fixed counter window per identifier — un seul { count, resetAt } par clé,
 * reset complet quand l'expiry est atteint. Pas de log d'événements ni de calcul sliding pondéré.
 *
 * Sufficient for single-instance deployments; cold-start vide les Maps et chaque instance
 * Vercel serverless a sa propre copie — protection best-effort uniquement.
 * Pour multi-instance + persistance: migrer vers Upstash Redis ou Arcjet.
 */

import { logger } from "@/shared/lib/logger";
import type { RateLimitConfig, RateLimitResult } from "@/shared/types/rate-limit.types";
import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export type { RateLimitConfig } from "@/shared/types/rate-limit.types";

// ============================================================================
// IN-MEMORY RATE LIMITER
// ============================================================================

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const globalIpLimitStore = new Map<string, RateLimitEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_STORE_SIZE = 10000;

// ============================================================================
// CONSTANTS
// ============================================================================

const GLOBAL_IP_LIMIT = 100;
const GLOBAL_IP_WINDOW = 60 * 1000; // 1 minute

const WHITELIST_IPS = process.env.RATE_LIMIT_WHITELIST?.split(",").map((ip) => ip.trim()) ?? [];
const BLACKLIST_IPS = process.env.RATE_LIMIT_BLACKLIST?.split(",").map((ip) => ip.trim()) ?? [];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Logs structured info when a rate limit is triggered.
 * Enables post-mortem analysis: which endpoints are targeted, which IPs are suspicious.
 */
/**
 * Masque les segments identifiants d'une clé de rate limit avant de la logguer.
 *
 * Le masquage porte sur le SEGMENT, où qu'il se trouve, et pas sur le début de la
 * chaîne : les identifiants du tunnel de paiement sont préfixés par leur action
 * (`checkout-confirm:user:…`, cf. `modules/payments/utils/payment-rate-limit-id.ts`),
 * si bien qu'un test `startsWith("user:")` ne les reconnaissait plus et logguait l'id
 * en clair. Le segment `guest:<email>:<ip>`, lui, n'a jamais été masqué : l'email du
 * client partait tel quel dans les logs à chaque blocage. L'IP reste disponible dans
 * le champ `ip=` dédié, on ne perd donc rien d'exploitable.
 */
function redactRateLimitIdentifier(identifier: string): string {
	return identifier.replace(/user:[^:]+/, "user:***").replace(/guest:.+$/, "guest:***");
}

function logRateLimitBlock(params: {
	type: "global-ip" | "per-action";
	identifier: string;
	ip: string | null;
	limit: number;
	windowMs: number;
	retryAfterSeconds: number;
}): void {
	logger.warn(
		`Blocked: type=${params.type} identifier=${redactRateLimitIdentifier(params.identifier)} ip=${params.ip} limit=${params.limit} windowMs=${params.windowMs} retryAfter=${params.retryAfterSeconds}`,
		{ service: "rate-limit" },
	);
}

function formatRetryAfter(seconds: number): string {
	if (seconds < 60) {
		return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
	}
	const minutes = Math.ceil(seconds / 60);
	return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

function evictExpired(store: Map<string, RateLimitEntry>, now: number): void {
	for (const [key, entry] of store.entries()) {
		if (entry.resetAt < now) {
			store.delete(key);
		}
	}
}

function trimStoreToMaxSize(store: Map<string, RateLimitEntry>): void {
	if (store.size <= MAX_STORE_SIZE) return;
	const entries = Array.from(store.entries()).sort((a, b) => a[1].resetAt - b[1].resetAt);
	const targetSize = Math.floor(MAX_STORE_SIZE * 0.9);
	const toDelete = entries.slice(0, entries.length - targetSize);
	toDelete.forEach(([key]) => store.delete(key));
}

function cleanupExpiredEntries(): void {
	const now = Date.now();
	const shouldForceCleanup =
		rateLimitStore.size > MAX_STORE_SIZE || globalIpLimitStore.size > MAX_STORE_SIZE;

	if (
		!shouldForceCleanup &&
		(now - lastCleanup < CLEANUP_INTERVAL ||
			(rateLimitStore.size < 1000 && globalIpLimitStore.size < 1000))
	) {
		return;
	}

	lastCleanup = now;

	evictExpired(rateLimitStore, now);
	evictExpired(globalIpLimitStore, now);
	trimStoreToMaxSize(rateLimitStore);
	trimStoreToMaxSize(globalIpLimitStore);
}

// ============================================================================
// MAIN EXPORTS
// ============================================================================

/**
 * Checks and increments the rate limit counter for an identifier.
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
	ipAddress?: string | null,
): Promise<RateLimitResult> {
	const { limit = 10, windowMs = 60000, skipGlobalIpLimit = false } = config;
	const now = Date.now();

	// Resolve effective IP: extract from identifier prefix OR use explicit param
	const extractedIp = identifier.startsWith("ip:") ? identifier.substring(3) : null;
	const effectiveIp = extractedIp ?? ipAddress ?? null;

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

	return checkRateLimitInMemory(identifier, effectiveIp, limit, windowMs, skipGlobalIpLimit);
}

// ============================================================================
// IN-MEMORY IMPLEMENTATION
// ============================================================================

function checkRateLimitInMemory(
	identifier: string,
	ipAddress: string | null,
	limit: number,
	windowMs: number,
	skipGlobalIpLimit = false,
): RateLimitResult {
	const now = Date.now();
	// ⚠️ La clé ne porte QUE l'identifiant : ni le nom de l'action, ni sa config. Deux
	// actions qui passent le même identifiant partagent donc un compteur, et la fenêtre
	// appartient à la première entrée créée. Les 4 actions de paiement préfixent leur
	// identifiant par l'action (`modules/payments/utils/payment-rate-limit-id.ts`) ;
	// panier, favoris et codes promo restent sur un identifiant nu.
	// @see docs/KNOWN-ISSUES.md — KI-004
	const key = `ratelimit:${identifier}`;

	// Global IP limit — read/modify/write fully synchronous (no await between get/set)
	// WEBHOOK-AUDIT-003 : les endpoints machine-to-machine (webhooks Stripe / PA) s'en
	// exemptent via `skipGlobalIpLimit`, sinon leur `limit` propre est inatteignable.
	if (ipAddress && !skipGlobalIpLimit) {
		const globalKey = `global:ip:${ipAddress}`;
		const existingGlobal = globalIpLimitStore.get(globalKey);
		const globalEntry =
			!existingGlobal || existingGlobal.resetAt < now
				? { count: 0, resetAt: now + GLOBAL_IP_WINDOW }
				: existingGlobal;

		if (globalEntry.count >= GLOBAL_IP_LIMIT) {
			const retryAfterSeconds = Math.ceil((globalEntry.resetAt - now) / 1000);
			logRateLimitBlock({
				type: "global-ip",
				identifier,
				ip: ipAddress,
				limit: GLOBAL_IP_LIMIT,
				windowMs: GLOBAL_IP_WINDOW,
				retryAfterSeconds,
			});
			return {
				success: false,
				remaining: 0,
				limit: GLOBAL_IP_LIMIT,
				reset: globalEntry.resetAt,
				retryAfter: retryAfterSeconds,
				error: `Trop de requêtes depuis votre adresse IP. Veuillez réessayer dans ${formatRetryAfter(retryAfterSeconds)}.`,
			};
		}

		globalIpLimitStore.set(globalKey, {
			count: globalEntry.count + 1,
			resetAt: globalEntry.resetAt,
		});
	}

	// Per-action limit — same read/modify/write atomicity
	const existing = rateLimitStore.get(key);
	const entry =
		!existing || existing.resetAt < now ? { count: 0, resetAt: now + windowMs } : existing;

	const wouldExceedLimit = entry.count >= limit;

	if (!wouldExceedLimit) {
		rateLimitStore.set(key, { count: entry.count + 1, resetAt: entry.resetAt });
	}

	const success = !wouldExceedLimit;
	const finalCount = success ? entry.count + 1 : entry.count;
	const remaining = Math.max(0, limit - finalCount);
	const retryAfterSeconds = success ? undefined : Math.ceil((entry.resetAt - now) / 1000);

	if (!success) {
		logRateLimitBlock({
			type: "per-action",
			identifier,
			ip: ipAddress,
			limit,
			windowMs,
			retryAfterSeconds: retryAfterSeconds!,
		});
	}

	// Cleanup hors chemin critique (après check). Évite une fenêtre de race entre
	// le check global et le check per-action si cleanup est lent (sort O(N log N)).
	cleanupExpiredEntries();

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
	ipAddress?: string | null,
): string {
	if (userId) return `user:${userId}`;
	if (sessionId) return `session:${sessionId}`;
	if (ipAddress) return `ip:${ipAddress}`;
	return "anonymous";
}

/**
 * Extracts the real client IP from Next.js headers
 *
 * Ordre de priorité Vercel-first :
 * 1. `x-vercel-forwarded-for` — injecté par l'edge Vercel, non-spoofable côté client
 * 2. `x-real-ip` — alternative posée par Vercel/proxies de confiance
 * 3. `x-forwarded-for` — fallback dev local / proxies non-Vercel (premier IP de la chain)
 *
 * Sur Vercel, un client peut envoyer `X-Forwarded-For: 1.2.3.4` mais l'edge Vercel ajoute
 * la vraie IP dans `x-vercel-forwarded-for` que le client ne peut pas écraser.
 */
export async function getClientIp(headers: ReadonlyHeaders): Promise<string | null> {
	const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
	if (vercelForwardedFor) return vercelForwardedFor.split(",")[0]!.trim();

	const realIp = headers.get("x-real-ip");
	if (realIp) return realIp.trim();

	const forwardedFor = headers.get("x-forwarded-for");
	if (forwardedFor) return forwardedFor.split(",")[0]!.trim();

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
export function getRateLimitStatus(identifier: string): { count: number; resetAt: number } | null {
	const entry = rateLimitStore.get(`ratelimit:${identifier}`);
	if (!entry || entry.resetAt < Date.now()) return null;
	return { count: entry.count, resetAt: entry.resetAt };
}
