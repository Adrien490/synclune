import { headers } from "next/headers";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import type { RateLimitConfig } from "@/shared/lib/rate-limit";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getWishlistSessionId, getOrCreateWishlistSessionId } from "./wishlist-session";

/**
 * Contexte retourné après vérification du rate limiting
 */
export type WishlistRateLimitContext = {
	userId: string | undefined;
	sessionId: string | null;
	ipAddress: string | null;
};

type WishlistRateLimitSuccess = {
	success: true;
	context: WishlistRateLimitContext;
};

type WishlistRateLimitError = {
	success: false;
	errorState: ActionState;
};

export type WishlistRateLimitResult = WishlistRateLimitSuccess | WishlistRateLimitError;

export type CheckWishlistRateLimitOptions = {
	/**
	 * Si true, crée un sessionId si l'utilisateur n'est pas connecté et n'a pas de session.
	 * Utiliser pour les actions comme addToWishlist qui ont besoin d'une wishlist.
	 * @default false
	 */
	createSessionIfMissing?: boolean;
};

/**
 * Vérifie le rate limiting pour les actions de la wishlist.
 *
 * Cette fonction centralise :
 * - La récupération de la session utilisateur
 * - La gestion du sessionId (lecture ou création)
 * - La récupération de l'IP client
 * - La vérification du rate limiting
 *
 * @param limitConfig - Configuration du rate limiting (ex: WISHLIST_LIMITS.ADD)
 * @param options - Options (createSessionIfMissing pour créer une session visiteur)
 * @returns WishlistRateLimitResult avec le contexte ou une erreur ActionState
 */
export async function checkWishlistRateLimit(
	limitConfig: RateLimitConfig,
	options: CheckWishlistRateLimitOptions = {}
): Promise<WishlistRateLimitResult> {
	const { createSessionIfMissing = false } = options;

	// 1. Récupérer la session utilisateur
	const session = await getSession();
	const userId = session?.user?.id;

	// 2. Gérer le sessionId selon le contexte
	let sessionId: string | null = null;
	if (!userId) {
		sessionId = createSessionIfMissing
			? await getOrCreateWishlistSessionId()
			: await getWishlistSessionId();
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
 * Version pour mergeWishlists qui reçoit déjà userId et sessionId en paramètres.
 * Ne récupère pas la session (déjà vérifiée par l'appelant).
 *
 * @param userId - ID de l'utilisateur connecté
 * @param sessionId - SessionId de la wishlist visiteur
 * @param limitConfig - Configuration du rate limiting
 * @returns WishlistRateLimitResult
 */
export async function checkMergeWishlistsRateLimit(
	userId: string,
	sessionId: string,
	limitConfig: RateLimitConfig
): Promise<WishlistRateLimitResult> {
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
