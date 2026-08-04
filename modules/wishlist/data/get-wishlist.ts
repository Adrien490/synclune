import { notDeleted, prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import { GET_PRODUCTS_SELECT } from "@/modules/products/constants/product.constants";
import { cacheProducts } from "@/modules/products/utils/cache.utils";
import { readWishlistCookie } from "@/modules/wishlist/lib/wishlist-cookie";

import type { GetWishlistReturn } from "../types/wishlist.types";

// Re-export types for components that import from data/
export type { GetWishlistReturn } from "../types/wishlist.types";

/**
 * Récupère les produits favoris du visiteur.
 *
 * Les Product IDs viennent du cookie `wishlist` (SSOT depuis le retrait de la
 * base 2026-08-03) ; seule la matérialisation en produits passe par la DB.
 * Un id dont le produit n'est plus PUBLIC est silencieusement écarté (même
 * comportement que l'ancien filtre de relation).
 *
 * Plus de pagination : le cookie est plafonné à `WISHLIST_MAX_ITEMS` (100),
 * la grille rend tout.
 */
export async function getWishlist(): Promise<GetWishlistReturn> {
	try {
		const productIds = await readWishlistCookie();

		if (productIds.length === 0) {
			return { items: [], totalCount: 0 };
		}

		const items = await fetchWishlistProducts(productIds);
		return { items, totalCount: items.length };
	} catch (e) {
		// Le repli vit ICI, HORS du scope "use cache" de fetchWishlistProducts —
		// sinon la liste vide d'une panne serait mise en cache (CACHE-DEGRADED-VALUE-001).
		//
		// Lecture avortée à la clôture d'un prerender (build) : signal de contrôle
		// Next, le rendu est jeté — repli silencieux, pas un incident à logger.
		// Deux formes ici, d'où la SSOT plutôt qu'`unstable_rethrow` : `cookies()`
		// qui rejette (HANGING_PROMISE_REJECTION, observé sur /favoris) ET la lecture
		// `"use cache"` coupée (« Connection closed. », que Next ne marque pas.)
		if (!isPrerenderInterrupt(e)) {
			logger.error("Failed to fetch wishlist", e, { service: "wishlist" });
		}
		return { items: [], totalCount: 0 };
	}
}

/**
 * Matérialise une liste de Product IDs en produits publics, dans l'ordre des
 * ids (le cookie range le plus récent en premier).
 *
 * Cache PUBLIC volontaire : la clé d'une entrée `"use cache"` est construite
 * sur les ARGUMENTS — ici des Product IDs, du catalogue pur. Deux visiteuses
 * avec la même liste partagent l'entrée, et rien de personnel n'est retourné
 * (la liste elle-même vient du cookie de l'appelante, jamais du cache).
 * Même politique d'invalidation que la PLP (`cacheProducts()` → tag
 * PRODUCTS_LIST, profil catalog).
 */
async function fetchWishlistProducts(productIds: string[]): Promise<GetWishlistReturn["items"]> {
	"use cache";
	cacheProducts();

	// ⚠️ AUCUN try/catch dans ce scope : le repli appartient à `getWishlist`,
	// hors du cache — sinon le vide d'une panne est mis en cache pour toute la
	// fenêtre du profil. Même motif que `get-products.ts`.
	{
		const products = await prisma.product.findMany({
			where: {
				id: { in: productIds },
				status: "PUBLIC",
				...notDeleted,
			},
			select: GET_PRODUCTS_SELECT,
		});

		// findMany ne garantit pas l'ordre de `in` — on réordonne sur le cookie
		const byId = new Map(products.map((product) => [product.id, product]));
		return productIds.flatMap((id) => byId.get(id) ?? []);
	}
}
