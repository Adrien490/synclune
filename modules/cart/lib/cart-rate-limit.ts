import { headers } from "next/headers";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import type { RateLimitConfig } from "@/shared/lib/rate-limit";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getGuestSessionId, getOrCreateGuestSessionId } from "./guest-session";

type CartRateLimitSuccess = {
	success: true;
};

type CartRateLimitError = {
	success: false;
	errorState: ActionState;
};

type CartRateLimitResult = CartRateLimitSuccess | CartRateLimitError;

type CheckCartRateLimitOptions = {
	/**
	 * Si true, crée un sessionId invité s'il n'en existe pas encore.
	 * Utiliser pour les actions comme addToCart qui ont besoin d'un panier.
	 * @default false
	 */
	createSessionIfMissing?: boolean;
};

/**
 * Vérifie le rate limiting pour les actions du panier.
 *
 * Le panier est 100 % invité (cookie `cart`, migration lean lot 1 pour la
 * disparition de la branche session) : l'identité de rate limit est le
 * sessionId invité, à défaut l'IP.
 *
 * @param limitConfig - Configuration du rate limiting (ex: CART_LIMITS.ADD)
 * @param options - Options (createSessionIfMissing pour créer une session visiteur)
 *
 * @example
 * ```ts
 * const result = await checkCartRateLimit(CART_LIMITS.ADD, { createSessionIfMissing: true });
 * if (!result.success) {
 *   return result.errorState;
 * }
 * ```
 */
export async function checkCartRateLimit(
	limitConfig: RateLimitConfig,
	options: CheckCartRateLimitOptions = {},
): Promise<CartRateLimitResult> {
	const { createSessionIfMissing = false } = options;

	// 1. Session invité (lecture, ou création si demandée)
	const sessionId = createSessionIfMissing
		? await getOrCreateGuestSessionId()
		: await getGuestSessionId();

	// 2. Récupérer l'IP client
	const headersList = await headers();
	const ipAddress = await getClientIp(headersList);

	// 3. Vérifier le rate limiting (pass IP explicitly for global limit check)
	const rateLimitId = getRateLimitIdentifier(undefined, sessionId, ipAddress);
	const rateLimit = await checkRateLimit(rateLimitId, limitConfig, ipAddress);

	if (!rateLimit.success) {
		return {
			success: false,
			errorState: {
				status: ActionStatus.ERROR,
				message: rateLimit.error ?? "Trop de requêtes. Veuillez réessayer plus tard.",
			},
		};
	}

	return { success: true };
}

// `checkMergeCartsRateLimit` retiré (audit wishlist 2026-08-01) : son unique
// caller `merge-carts` a disparu avec l'espace client (2026-07-31).
