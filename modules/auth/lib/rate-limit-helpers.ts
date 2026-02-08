/**
 * Helpers de rate limiting basés sur l'authentification
 *
 * Ces helpers ont besoin d'accéder à la session utilisateur,
 * donc ils sont dans le module auth plutôt que shared/.
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
	const check = await checkRateLimit(identifier, limit);

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
