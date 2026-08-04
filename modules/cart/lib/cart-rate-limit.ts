import { headers } from "next/headers";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import type { RateLimitConfig } from "@/shared/lib/rate-limit";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getGuestSessionId, getOrCreateGuestSessionId } from "./guest-session";

/**
 * Contexte retourné après vérification du rate limiting
 */
type CartRateLimitContext = {
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

type CartRateLimitResult = CartRateLimitSuccess | CartRateLimitError;

type CheckCartRateLimitOptions = {
	/**
	 * Si true, crée un sessionId si l'utilisateur n'est pas connecté et n'a pas de session.
	 * Utiliser pour les actions comme addToCart qui ont besoin d'un panier.
	 * @default false
	 */
	createSessionIfMissing?: boolean;
	/**
	 * Si true, vérifie que l'userId de la session existe en DB AVANT de consommer le quota
	 * rate-limit. Cas typique : compte supprimé pendant onglet ouvert → fallback guest sans
	 * brûler le slot rate-limit user.
	 * @default false
	 */
	validateUserExists?: boolean;
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
	options: CheckCartRateLimitOptions = {},
): Promise<CartRateLimitResult> {
	const { createSessionIfMissing = false, validateUserExists = false } = options;

	// 1. Récupérer la session utilisateur
	const session = await getSession();
	let userId = session?.user.id;

	// 1b. (Optionnel) Vérifier que l'userId existe encore en DB AVANT rate-limit.
	// Évite qu'un compte supprimé en cours de session ne brûle son quota user
	// avant de tomber sur le fallback guest.
	if (userId && validateUserExists) {
		const userExists = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});
		if (!userExists) {
			userId = undefined;
		}
	}

	// 2. Gérer le sessionId selon le contexte
	let sessionId: string | null = null;
	if (!userId) {
		sessionId = createSessionIfMissing
			? await getOrCreateGuestSessionId()
			: await getGuestSessionId();
	}

	// 3. Récupérer l'IP client
	const headersList = await headers();
	const ipAddress = await getClientIp(headersList);

	// 4. Vérifier le rate limiting (pass IP explicitly for global limit check)
	const rateLimitId = getRateLimitIdentifier(userId, sessionId, ipAddress);
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

	return {
		success: true,
		context: {
			userId,
			sessionId,
			ipAddress,
		},
	};
}

// `checkMergeCartsRateLimit` retiré (audit wishlist 2026-08-01) : son unique
// caller `merge-carts` a disparu avec l'espace client (2026-07-31).
