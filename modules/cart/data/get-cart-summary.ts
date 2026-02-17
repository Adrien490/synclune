import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCartSessionId } from "@/modules/cart/lib/cart-session";
import { prisma } from "@/shared/lib/prisma";

import { GET_CART_SUMMARY_SELECT } from "../constants/cart";
import { cacheCartSummary } from "../constants/cache";
import type { CartSummary, GetCartSummaryReturn } from "../types/cart.types";

// Re-export pour compatibilité
export type { CartSummary, GetCartSummaryReturn } from "../types/cart.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un résumé rapide du panier pour l'affichage du tableau de bord
 * - Pour un utilisateur connecté : récupère via userId
 * - Pour un visiteur : récupère via sessionId
 */
export async function getCartSummary(): Promise<GetCartSummaryReturn> {
	const session = await getSession();

	const userId = session?.user?.id;
	const sessionId = !userId ? (await getCartSessionId()) ?? undefined : undefined;

	return fetchCartSummary(userId, sessionId);
}

/**
 * Récupère le résumé du panier depuis la DB avec cache
 *
 * Utilise "use cache" pour:
 * - Isoler les données par utilisateur/session (pas de fuite)
 * - Permettre le prefetching runtime (stale >= 30s)
 * - Stockage côté client uniquement (sécurité)
 * - Invalidation lors de modifications du panier
 *
 * @param userId - ID de l'utilisateur connecté (prioritaire)
 * @param sessionId - ID de session pour les visiteurs
 * @returns Le résumé du panier
 */
export async function fetchCartSummary(
	userId: string | undefined,
	sessionId: string | undefined
): Promise<GetCartSummaryReturn> {
	"use cache: private";
	cacheCartSummary(userId, sessionId);

	// Retourner un résumé vide si pas d'identifiant
	if (!userId && !sessionId) {
		return {
			itemCount: 0,
			totalAmount: 0,
			hasItems: false,
		};
	}

	try {
		const cart = await prisma.cart.findFirst({
			where: {
				...(userId ? { userId } : { sessionId: sessionId! }),
				OR: [
					{ expiresAt: null },
					{ expiresAt: { gt: new Date() } },
				],
			},
			select: GET_CART_SUMMARY_SELECT,
		});

		if (!cart || !cart.items.length) {
			return {
				itemCount: 0,
				totalAmount: 0,
				hasItems: false,
			};
		}

		const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
		const totalAmount = cart.items.reduce(
			(sum, item) => sum + item.priceAtAdd * item.quantity,
			0
		);

		return {
			itemCount,
			totalAmount,
			hasItems: true,
		};
	} catch (error) {
		return {
			itemCount: 0,
			totalAmount: 0,
			hasItems: false,
		};
	}
}
