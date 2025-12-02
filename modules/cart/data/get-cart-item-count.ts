import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCartSessionId } from "@/modules/cart/lib/cart-session";
import { prisma } from "@/shared/lib/prisma";

// ============================================================================
// TYPES
// ============================================================================

export type GetCartItemCountReturn = number;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre total d'articles dans le panier
 *
 * Query optimisée qui ne récupère que le compteur sans charger tous les items.
 * Utile pour afficher un badge dans la navigation.
 *
 * @returns Le nombre total d'articles (0 si pas de panier)
 */
export async function getCartItemCount(): Promise<GetCartItemCountReturn> {
	const session = await getSession();
	const userId = session?.user?.id;
	const sessionId = !userId ? await getCartSessionId() : null;

	return await fetchCartItemCount(userId, sessionId || undefined);
}

/**
 * Récupère le nombre total d'articles dans le panier depuis la DB avec cache
 *
 * Utilise "use cache: private" pour:
 * - Isoler les données par utilisateur/session (pas de fuite)
 * - Permettre le prefetching runtime (stale >= 30s)
 * - Stockage côté client uniquement (sécurité)
 * - Invalidation lors de modifications du panier
 *
 * @param userId - ID de l'utilisateur connecté (prioritaire)
 * @param sessionId - ID de session pour les visiteurs
 * @returns Le nombre total d'articles (0 si pas de panier)
 */
export async function fetchCartItemCount(
	userId?: string,
	sessionId?: string
): Promise<GetCartItemCountReturn> {
	"use cache: private";
	cacheLife({ stale: 300 });

	cacheTag(
		userId
			? `cart-count-user-${userId}`
			: sessionId
				? `cart-count-session-${sessionId}`
				: "cart-count-anonymous"
	);

	if (!userId && !sessionId) {
		return 0;
	}

	// Single query: agrégation directe sur CartItem via relation cart
	const result = await prisma.cartItem.aggregate({
		where: {
			cart: userId ? { userId } : { sessionId },
		},
		_sum: {
			quantity: true,
		},
	});

	return result._sum.quantity || 0;
}
