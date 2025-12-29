/**
 * Rate limiting simple en mémoire pour le développement
 * et production sans dépendances externes
 *
 * ⚠️ LIMITATIONS :
 * - Store en mémoire : perdu au redémarrage de l'instance serverless
 * - Mono-instance : ne fonctionne PAS sur plusieurs instances Vercel
 * - Parfait pour v1 avec faible trafic (<1000 req/min)
 *
 * ✅ COMPATIBLE SERVERLESS :
 * - Nettoyage "lazy" au lieu de setInterval
 * - Pas de timers qui restent actifs
 * - Fonctionne dans environnements "freeze" (Vercel, Lambda)
 *
 * 🚀 Pour production avec trafic élevé, migrer vers Redis:
 * - Installer: npm install @upstash/ratelimit @upstash/redis
 * - Configurer Upstash Redis sur https://upstash.com
 * - Remplacer cette implémentation par Upstash Ratelimit
 * - Permet rate limiting distribué sur N instances
 *
 * 🛡️ PROTECTIONS DDOS :
 * - Limite globale par IP (toutes actions confondues)
 * - Éviction LRU automatique si mémoire saturée
 * - Logging des abus pour détection patterns
 */

import type { RateLimitConfig, RateLimitResult } from "@/shared/types/rate-limit.types"

export type { RateLimitConfig, RateLimitResult } from "@/shared/types/rate-limit.types"

interface RateLimitEntry {
	count: number
	resetAt: number
}

// Store en mémoire (simple pour v1, perdu au redémarrage)
// Note: Pour une app multi-instances, utiliser Redis (Upstash)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Store pour rate limit global par IP (protection DDoS)
const globalIpLimitStore = new Map<string, RateLimitEntry>();

// Track du dernier nettoyage pour éviter de nettoyer trop souvent
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Limites de sécurité
const MAX_STORE_SIZE = 10000; // Limite max d'entrées en mémoire (protection memory leak)
const GLOBAL_IP_LIMIT = 100; // 100 requêtes par minute max par IP (toutes actions)
const GLOBAL_IP_WINDOW = 60 * 1000; // 1 minute

// Whitelist/Blacklist (configurables via variables d'environnement)
const WHITELIST_IPS = process.env.RATE_LIMIT_WHITELIST?.split(",").map((ip) => ip.trim()) || [];
const BLACKLIST_IPS = process.env.RATE_LIMIT_BLACKLIST?.split(",").map((ip) => ip.trim()) || [];

/**
 * Nettoyage "lazy" des entrées expirées avec éviction LRU
 * S'exécute uniquement toutes les 5 minutes lors d'une vérification
 * ET seulement si le store dépasse 1000 entrées (évite le nettoyage inutile)
 * Compatible avec environnements serverless (pas de setInterval)
 *
 * PROTECTION MEMORY LEAK :
 * - Si le store dépasse MAX_STORE_SIZE (10k entrées), force le nettoyage
 * - Si toujours trop grand après nettoyage, éviction LRU (supprime les plus anciennes)
 */
function cleanupExpiredEntries(): void {
	const now = Date.now();

	// Nettoyage forcé si dépassement MAX_STORE_SIZE (protection memory leak)
	const shouldForceCleanup = rateLimitStore.size > MAX_STORE_SIZE;

	// Ne nettoyer que toutes les 5 minutes ET si le store est assez grand
	// OU si on dépasse la limite max (force cleanup)
	if (!shouldForceCleanup && (now - lastCleanup < CLEANUP_INTERVAL || rateLimitStore.size < 1000)) {
		return;
	}

	if (shouldForceCleanup) {
		// console.warn("[RATE_LIMIT] Store size exceeded MAX_STORE_SIZE, forcing cleanup", {
		// 	size: rateLimitStore.size,
		// 	max: MAX_STORE_SIZE,
		// 	timestamp: new Date().toISOString(),
		// });
	}

	lastCleanup = now;

	// Étape 1: Supprimer toutes les entrées expirées
	let deletedCount = 0;
	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetAt < now) {
			rateLimitStore.delete(key);
			deletedCount++;
		}
	}

	if (deletedCount > 0) {
		// console.log(`[RATE_LIMIT] Cleaned up ${deletedCount} expired entries`);
	}

	// Étape 2: Si toujours trop grand après cleanup, éviction LRU (Least Recently Used)
	if (rateLimitStore.size > MAX_STORE_SIZE) {
		// console.warn("[RATE_LIMIT] Store still too large after cleanup, applying LRU eviction", {
		// 	currentSize: rateLimitStore.size,
		// 	max: MAX_STORE_SIZE,
		// });

		// Trier les entrées par resetAt (les plus anciennes en premier)
		const entries = Array.from(rateLimitStore.entries()).sort(
			(a, b) => a[1].resetAt - b[1].resetAt
		);

		// Calculer combien d'entrées supprimer (garder 90% de MAX_STORE_SIZE pour marge)
		const targetSize = Math.floor(MAX_STORE_SIZE * 0.9);
		const toDelete = entries.slice(0, entries.length - targetSize);

		// Supprimer les entrées les plus anciennes
		toDelete.forEach(([key]) => rateLimitStore.delete(key));

		// console.error("[RATE_LIMIT] LRU eviction completed", {
		// 	deleted: toDelete.length,
		// 	remainingSize: rateLimitStore.size,
		// 	targetSize,
		// });
	}

	// Nettoyer aussi le store global IP
	for (const [key, entry] of globalIpLimitStore.entries()) {
		if (entry.resetAt < now) {
			globalIpLimitStore.delete(key);
		}
	}
}

/**
 * Helper pour formater le temps d'attente de manière lisible
 */
function formatRetryAfter(seconds: number): string {
	if (seconds < 60) {
		return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
	}
	const minutes = Math.ceil(seconds / 60);
	return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

/**
 * Vérifie et incrémente le compteur de rate limiting pour un identifiant
 *
 * PROTECTIONS INTÉGRÉES :
 * - Whitelist: IPs toujours autorisées (admin, tests)
 * - Blacklist: IPs toujours bloquées (malveillantes)
 * - Limite globale par IP: Protection DDoS (100 req/min max toutes actions)
 * - Logging des abus: Détection patterns anormaux
 *
 * @param identifier - Identifiant unique (IP, userId, sessionId, etc.)
 * @param config - Configuration du rate limiting
 * @returns Résultat du rate limiting
 *
 * @example
 * ```ts
 * const result = checkRateLimit('user-123', { limit: 10, windowMs: 60000 });
 * if (!result.success) {
 *   return { error: result.error };
 * }
 * ```
 */
export function checkRateLimit(
	identifier: string,
	config: RateLimitConfig = {}
): RateLimitResult {
	const { limit = 10, windowMs = 60000 } = config;
	const now = Date.now();
	const key = `ratelimit:${identifier}`;

	// Extraire l'IP de l'identifiant (si présent)
	const ipAddress = identifier.startsWith("ip:") ? identifier.substring(3) : null;

	// 🛡️ WHITELIST: Toujours autoriser les IPs whitelistées
	if (ipAddress && WHITELIST_IPS.length > 0 && WHITELIST_IPS.includes(ipAddress)) {
		return {
			success: true,
			remaining: 999,
			limit: 999,
			reset: now + windowMs,
		};
	}

	// 🛡️ BLACKLIST: Toujours bloquer les IPs blacklistées
	if (ipAddress && BLACKLIST_IPS.length > 0 && BLACKLIST_IPS.includes(ipAddress)) {
		// console.warn("[RATE_LIMIT] Blacklisted IP blocked", {
		// 	identifier,
		// 	ip: ipAddress,
		// 	timestamp: new Date().toISOString(),
		// });

		return {
			success: false,
			remaining: 0,
			limit: 0,
			reset: now + 86400000, // 24h
			retryAfter: 86400,
			error: "Accès refusé. Contactez le support si vous pensez qu'il s'agit d'une erreur.",
		};
	}

	// 🛡️ PROTECTION DDOS GLOBALE: Limite par IP (toutes actions confondues)
	if (ipAddress) {
		const globalKey = `global:ip:${ipAddress}`;
		let globalEntry = globalIpLimitStore.get(globalKey);

		// Créer ou réinitialiser l'entrée si expirée
		if (!globalEntry || globalEntry.resetAt < now) {
			globalEntry = {
				count: 0,
				resetAt: now + GLOBAL_IP_WINDOW,
			};
		}

		// Vérifier la limite globale
		if (globalEntry.count >= GLOBAL_IP_LIMIT) {
			const retryAfterSeconds = Math.ceil((globalEntry.resetAt - now) / 1000);

			// console.warn("[RATE_LIMIT] Global IP limit exceeded (DDoS protection)", {
			// 	identifier,
			// 	ip: ipAddress,
			// 	count: globalEntry.count,
			// 	limit: GLOBAL_IP_LIMIT,
			// 	window: GLOBAL_IP_WINDOW / 1000 + "s",
			// 	timestamp: new Date().toISOString(),
			// });

			return {
				success: false,
				remaining: 0,
				limit: GLOBAL_IP_LIMIT,
				reset: globalEntry.resetAt,
				retryAfter: retryAfterSeconds,
				error: `Trop de requêtes depuis votre adresse IP. Veuillez réessayer dans ${formatRetryAfter(retryAfterSeconds)}.`,
			};
		}

		// Incrémenter le compteur global
		globalEntry.count++;
		globalIpLimitStore.set(globalKey, globalEntry);
	}

	// Nettoyage lazy des entrées expirées (toutes les 5 min)
	cleanupExpiredEntries();

	// Récupérer l'entrée existante
	let entry = rateLimitStore.get(key);

	// Si l'entrée a expiré ou n'existe pas, créer une nouvelle entrée
	if (!entry || entry.resetAt < now) {
		entry = {
			count: 0,
			resetAt: now + windowMs,
		};
	}

	// Vérifier si la limite serait dépassée AVANT d'incrémenter
	const wouldExceedLimit = entry.count >= limit;

	// Incrémenter uniquement si pas encore bloqué
	if (!wouldExceedLimit) {
		entry.count++;
		rateLimitStore.set(key, entry);
	} else {
		// 📊 LOGGING: Rate limit dépassé
		// const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
		// console.warn("[RATE_LIMIT] Rate limit exceeded", {
		// 	identifier,
		// 	limit,
		// 	count: entry.count,
		// 	window: windowMs / 1000 + "s",
		// 	retryAfter: retryAfterSeconds + "s",
		// 	timestamp: new Date().toISOString(),
		// });
	}

	const success = !wouldExceedLimit;
	const remaining = Math.max(0, limit - entry.count);
	const retryAfterSeconds = success ? undefined : Math.ceil((entry.resetAt - now) / 1000);

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

/**
 * Middleware helper pour extraire un identifiant de requête
 * Utilise l'IP comme fallback si userId/sessionId indisponibles
 *
 * @param userId - ID de l'utilisateur connecté
 * @param sessionId - ID de session pour les visiteurs
 * @param ipAddress - Adresse IP (x-forwarded-for ou x-real-ip)
 * @returns Identifiant unique pour le rate limiting
 */
export function getRateLimitIdentifier(
	userId?: string | null,
	sessionId?: string | null,
	ipAddress?: string | null
): string {
	if (userId) {
		return `user:${userId}`;
	}
	if (sessionId) {
		return `session:${sessionId}`;
	}
	if (ipAddress) {
		return `ip:${ipAddress}`;
	}
	// Fallback: utiliser un identifiant générique (permissif)
	return "anonymous";
}

/**
 * Extrait l'adresse IP réelle depuis les headers Next.js
 * Supporte x-forwarded-for et x-real-ip (proxies/load balancers)
 *
 * @param headers - Headers de la requête Next.js
 * @returns Adresse IP ou null
 */
export async function getClientIp(
	headers: Awaited<ReturnType<typeof import("next/headers").headers>>
): Promise<string | null> {
	// Priorité 1: x-forwarded-for (standard proxy/CDN)
	const forwardedFor = headers.get("x-forwarded-for");
	if (forwardedFor) {
		// Prendre la première IP (client original)
		return forwardedFor.split(",")[0].trim();
	}

	// Priorité 2: x-real-ip (Nginx, Cloudflare)
	const realIp = headers.get("x-real-ip");
	if (realIp) {
		return realIp.trim();
	}

	// Pas d'IP disponible
	return null;
}

/**
 * Réinitialise le compteur pour un identifiant (utile pour les tests)
 */
export function resetRateLimit(identifier: string): void {
	rateLimitStore.delete(`ratelimit:${identifier}`);
}

/**
 * Obtient les statistiques actuelles de rate limiting pour un identifiant
 */
export function getRateLimitStatus(
	identifier: string
): { count: number; resetAt: number } | null {
	const entry = rateLimitStore.get(`ratelimit:${identifier}`);
	if (!entry || entry.resetAt < Date.now()) {
		return null;
	}
	return { count: entry.count, resetAt: entry.resetAt };
}
