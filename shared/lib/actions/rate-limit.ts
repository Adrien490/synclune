/**
 * Helpers de rate limiting pour Server Actions
 *
 * Wrappers autour du système de rate limiting qui retournent
 * des ActionState pour simplifier l'usage dans les actions.
 *
 * NOTE: Les helpers qui nécessitent l'authentification (getRateLimitId, enforceRateLimitForCurrentUser)
 * sont dans @/modules/auth/lib/rate-limit-helpers
 */

import {
	checkRateLimit,
	type RateLimitConfig,
} from "@/shared/lib/rate-limit";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

/**
 * Applique un rate limit sur une action
 *
 * @param identifier - Identifiant unique (userId, sessionId, IP)
 * @param limit - Configuration du rate limit
 * @param ipAddress - Explicit client IP for global limit check (pass when identifier is user/session-based)
 * @returns success: true ou une erreur ActionState
 *
 * @example
 * ```ts
 * const rateCheck = enforceRateLimit(rateLimitId, CART_LIMITS.ADD, ipAddress);
 * if ("error" in rateCheck) return rateCheck.error;
 *
 * // Rate limit OK, continuer
 * ```
 */
export async function enforceRateLimit(
	identifier: string,
	limit: RateLimitConfig,
	ipAddress?: string | null
): Promise<{ success: true } | { error: ActionState }> {
	const check = await checkRateLimit(identifier, limit, ipAddress);

	if (!check.success) {
		return {
			error: {
				status: ActionStatus.ERROR,
				message: check.error || "Trop de requêtes. Veuillez réessayer plus tard.",
				data: {
					retryAfter: check.retryAfter,
					reset: check.reset,
				},
			},
		};
	}

	return { success: true };
}

// NOTE: getRateLimitId et enforceRateLimitForCurrentUser ont été déplacés vers
// @/modules/auth/lib/rate-limit-helpers car ils dépendent de l'authentification
