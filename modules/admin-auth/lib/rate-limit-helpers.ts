/**
 * Helpers de rate limiting basés sur l'identité courante.
 *
 * Repris de `modules/auth/lib/rate-limit-helpers.ts` (migration lean, lot 1) :
 * mêmes exports, mêmes contrats — seule la résolution d'identité change. La
 * session admin (cookie HMAC) compte sous l'identifiant stable `"admin"`,
 * tout le reste sous l'IP.
 */

import { headers } from "next/headers";
import {
	checkRateLimit,
	getClientIp,
	getRateLimitIdentifier,
	type RateLimitConfig,
} from "@/shared/lib/rate-limit";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { hasValidAdminSession } from "@/modules/admin-auth/lib/admin-session";

/**
 * Obtient un identifiant de rate limit et l'IP client pour l'identité courante.
 *
 * @example
 * ```ts
 * const { identifier, ipAddress } = await getRateLimitId();
 * const rateCheck = enforceRateLimit(identifier, CART_LIMITS.ADD, ipAddress);
 * ```
 */
export async function getRateLimitId(): Promise<{ identifier: string; ipAddress: string | null }> {
	const headersList = await headers();
	const ipAddress = await getClientIp(headersList);

	try {
		if (await hasValidAdminSession()) {
			// L'identifiant "admin" est stable à travers les IP : l'administratrice
			// garde un seul compteur (c'était le rôle de l'ancien identifiant userId).
			return { identifier: getRateLimitIdentifier("admin", null, null), ipAddress };
		}
	} catch {
		// Session non disponible : retomber sur l'IP
	}

	return { identifier: getRateLimitIdentifier(null, null, ipAddress), ipAddress };
}

/**
 * Applique un rate limit automatiquement pour l'identité courante.
 *
 * @example
 * ```ts
 * const rateCheck = await enforceRateLimitForCurrentUser(CART_LIMITS.ADD);
 * if ("error" in rateCheck) return rateCheck.error;
 * ```
 */
export async function enforceRateLimitForCurrentUser(
	limit: RateLimitConfig,
): Promise<{ success: true } | { error: ActionState }> {
	const { identifier, ipAddress } = await getRateLimitId();
	const check = await checkRateLimit(identifier, limit, ipAddress);

	if (!check.success) {
		return {
			error: {
				status: ActionStatus.ERROR,
				message: check.error ?? "Trop de requêtes. Veuillez réessayer plus tard.",
				...(check.retryAfter !== undefined && { retryAfter: check.retryAfter }),
			},
		};
	}

	return { success: true };
}
