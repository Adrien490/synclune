/**
 * Helpers de rate limiting pour Server Actions
 *
 * Wrappers autour du système de rate limiting qui retournent
 * des ActionState pour simplifier l'usage dans les actions.
 */

import {
	checkRateLimit,
	getClientIp,
	getRateLimitIdentifier,
	type RateLimitConfig,
} from "@/shared/lib/rate-limit";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";

/**
 * Applique un rate limit sur une action
 *
 * @param identifier - Identifiant unique (userId, sessionId, IP)
 * @param limit - Configuration du rate limit
 * @returns success: true ou une erreur ActionState
 *
 * @example
 * ```ts
 * const rateCheck = enforceRateLimit(userId, CART_LIMITS.ADD);
 * if ("error" in rateCheck) return rateCheck.error;
 *
 * // Rate limit OK, continuer
 * ```
 */
export function enforceRateLimit(
	identifier: string,
	limit: RateLimitConfig
): { success: true } | { error: ActionState } {
	const check = checkRateLimit(identifier, limit);

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

/**
 * Obtient un identifiant de rate limit pour l'utilisateur/session/IP courant
 *
 * @returns L'identifiant de rate limit
 *
 * @example
 * ```ts
 * const rateLimitId = await getRateLimitId();
 * const rateCheck = enforceRateLimit(rateLimitId, CART_LIMITS.ADD);
 * ```
 */
export async function getRateLimitId(): Promise<string> {
	try {
		const session = await getSession();
		const userId = session?.user?.id;

		if (userId) {
			return getRateLimitIdentifier(userId, null, null);
		}
	} catch {
		// Session non disponible, utiliser IP
	}

	const headersList = await headers();
	const ipAddress = await getClientIp(headersList);

	return getRateLimitIdentifier(null, null, ipAddress);
}

/**
 * Applique un rate limit automatiquement pour l'utilisateur courant
 *
 * @param limit - Configuration du rate limit
 * @returns success: true ou une erreur ActionState
 *
 * @example
 * ```ts
 * const rateCheck = await enforceRateLimitForCurrentUser(CART_LIMITS.ADD);
 * if ("error" in rateCheck) return rateCheck.error;
 * ```
 */
export async function enforceRateLimitForCurrentUser(
	limit: RateLimitConfig
): Promise<{ success: true } | { error: ActionState }> {
	const identifier = await getRateLimitId();
	return enforceRateLimit(identifier, limit);
}
