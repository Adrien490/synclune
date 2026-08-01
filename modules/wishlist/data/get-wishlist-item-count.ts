import { getSession } from "@/modules/auth/lib/get-current-session";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import { getWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";
import { cacheWishlistCount } from "../constants/cache";

import type { GetWishlistItemCountReturn } from "../types/wishlist.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre d'items dans la wishlist de l'utilisateur connecté ou du visiteur
 *
 * Utilisé pour afficher le badge dans le header
 *
 * Supporte les utilisateurs connectés ET les visiteurs (sessions invité)
 *
 * @returns Nombre d'items dans la wishlist
 */
export async function getWishlistItemCount(): Promise<GetWishlistItemCountReturn> {
	try {
		const session = await getSession().catch((e) => {
			// Pendant le prerender (PPR), headers()/cookies() rejettent à la clôture —
			// signal attendu, pas un incident : le repli anonyme suffit, sans log.
			if (!isPrerenderInterrupt(e)) {
				logger.warn(
					`getSession failed in wishlist count, falling back to anonymous: ${e instanceof Error ? e.message : String(e)}`,
					{ service: "wishlist" },
				);
			}
			return null;
		});
		const userId = session?.user.id;
		const sessionId = !userId
			? await getWishlistSessionId().catch((e) => {
					if (!isPrerenderInterrupt(e)) {
						logger.warn(
							`getWishlistSessionId failed in wishlist count, no guest session: ${e instanceof Error ? e.message : String(e)}`,
							{ service: "wishlist" },
						);
					}
					return null;
				})
			: null;

		return await fetchWishlistItemCount(userId, sessionId ?? undefined);
	} catch (e) {
		// "use cache: private" rejette à la clôture du prerender — attendu, sans log.
		if (isPrerenderInterrupt(e)) return 0;
		logger.error("Failed to get wishlist item count", e, { service: "wishlist" });
		return 0;
	}
}

/**
 * Récupère le nombre d'items dans la wishlist d'un utilisateur ou visiteur.
 *
 * @internal Privé au module — accédé uniquement via le wrapper `getWishlistItemCount`
 * (qui résout `userId`/`sessionId` depuis la session/cookies). Ne JAMAIS appeler
 * directement avec un userId arbitraire : aucune vérification d'ownership ici.
 */
async function fetchWishlistItemCount(
	userId?: string,
	sessionId?: string,
): Promise<GetWishlistItemCountReturn> {
	"use cache: private";
	cacheWishlistCount(userId, sessionId);

	// ⚠️ AUCUN try/catch dans ce scope : le repli appartient au wrapper
	// `getWishlistItemCount`, hors du cache — sinon le 0 d'une panne est mis en
	// cache pour toute la fenêtre du profil. Même motif que `get-products.ts`.
	{
		// Pas d'utilisateur ni de session = pas de wishlist
		if (!userId && !sessionId) {
			return 0;
		}

		const count = await prisma.wishlistItem.count({
			where: {
				wishlist: userId ? { userId } : { sessionId },
				product: {
					status: "PUBLIC",
					...notDeleted,
				},
			},
		});

		return count;
	}
}
