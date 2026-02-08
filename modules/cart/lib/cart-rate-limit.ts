import { headers } from "next/headers";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import type { RateLimitConfig } from "@/shared/lib/rate-limit";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getCartSessionId, getOrCreateCartSessionId } from "./cart-session";

/**
 * Contexte retourné après vérification du rate limiting
 */
export type CartRateLimitContext = {
	userId: string | undefined;
	sessionId: string | null;
	ipAddress: string | null;
};

type CartRateLimitSuccess = {
	success: true;
	context: CartRateLimitContext;
};

type CartRateLimitError = {
	success: false;
	errorState: ActionState;
};

export type CartRateLimitResult = CartRateLimitSuccess | CartRateLimitError;

export type CheckCartRateLimitOptions = {
	/**
	 * Si true, crée un sessionId si l'utilisateur n'est pas connecté et n'a pas de session.
	 * Utiliser pour les actions comme addToCart qui ont besoin d'un panier.
	 * @default false
	 */
	createSessionIfMissing?: boolean;
};

/**
 * Vérifie le rate limiting pour les actions du panier.
 *
 * Cette fonction centralise :
 * - La récupération de la session utilisateur
 * - La gestion du sessionId (lecture ou création)
 * - La récupération de l'IP client
 * - La vérification du rate limiting
 *
 * @param limitConfig - Configuration du rate limiting (ex: CART_LIMITS.ADD)
 * @param options - Options (createSessionIfMissing pour créer une session visiteur)
 * @returns CartRateLimitResult avec le contexte ou une erreur ActionState
 *
 * @example
 * ```ts
 * const result = await checkCartRateLimit(CART_LIMITS.ADD, { createSessionIfMissing: true });
 * if (!result.success) {
 *   return result.errorState;
 * }
 * const { userId, sessionId } = result.context;
 * ```
 */
export async function checkCartRateLimit(
	limitConfig: RateLimitConfig,
	options: CheckCartRateLimitOptions = {}
): Promise<CartRateLimitResult> {
	const { createSessionIfMissing = false } = options;

	// 1. Récupérer la session utilisateur
	const session = await getSession();
	const userId = session?.user?.id;

	// 2. Gérer le sessionId selon le contexte
	let sessionId: string | null = null;
	if (!userId) {
		sessionId = createSessionIfMissing
			? await getOrCreateCartSessionId()
			: await getCartSessionId();
	}

	// 3. Récupérer l'IP client
	const headersList = await headers();
	const ipAddress = await getClientIp(headersList);

	// 4. Vérifier le rate limiting
	const rateLimitId = getRateLimitIdentifier(userId, sessionId, ipAddress);
	const rateLimit = await checkRateLimit(rateLimitId, limitConfig);

	if (!rateLimit.success) {
		return {
			success: false,
			errorState: {
				status: ActionStatus.ERROR,
				message: rateLimit.error || "Trop de requêtes. Veuillez réessayer plus tard.",
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			},
		};
	}

	return {
		success: true,
		context: {
			userId,
			sessionId,
			ipAddress,
		},
	};
}

/**
 * Version pour mergeCarts qui reçoit déjà userId et sessionId en paramètres.
 * Ne récupère pas la session (déjà vérifiée par l'appelant).
 *
 * @param userId - ID de l'utilisateur connecté
 * @param sessionId - SessionId du panier visiteur
 * @param limitConfig - Configuration du rate limiting
 * @returns CartRateLimitResult
 */
export async function checkMergeCartsRateLimit(
	userId: string,
	sessionId: string,
	limitConfig: RateLimitConfig
): Promise<CartRateLimitResult> {
	const headersList = await headers();
	const ipAddress = await getClientIp(headersList);

	const rateLimitId = getRateLimitIdentifier(userId, sessionId, ipAddress);
	const rateLimit = await checkRateLimit(rateLimitId, limitConfig);

	if (!rateLimit.success) {
		return {
			success: false,
			errorState: {
				status: ActionStatus.ERROR,
				message: "Trop de requêtes. Veuillez réessayer plus tard.",
			},
		};
	}

	return {
		success: true,
		context: {
			userId,
			sessionId,
			ipAddress,
		},
	};
}
