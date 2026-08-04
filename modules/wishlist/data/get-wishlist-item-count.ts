import { logger } from "@/shared/lib/logger";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import { readWishlistCookie } from "@/modules/wishlist/lib/wishlist-cookie";

import type { GetWishlistItemCountReturn } from "../types/wishlist.types";

/**
 * Récupère le nombre de favoris — badge du header.
 *
 * Source : le cookie `wishlist` (SSOT depuis le retrait de la base 2026-08-03),
 * aucune requête DB. Compte les ids du cookie tels quels : un produit archivé
 * depuis son ajout compte encore jusqu'à son retrait par la visiteuse — dérive
 * assumée (le filtre PUBLIC exigerait une requête par rendu, pour un badge).
 */
export async function getWishlistItemCount(): Promise<GetWishlistItemCountReturn> {
	try {
		const ids = await readWishlistCookie();
		return ids.length;
	} catch (e) {
		// Pendant le prerender (PPR), cookies() rejette à la clôture — signal
		// attendu, pas un incident : le repli 0 suffit, sans log.
		if (isPrerenderInterrupt(e)) return 0;
		logger.error("Failed to get wishlist item count", e, { service: "wishlist" });
		return 0;
	}
}
