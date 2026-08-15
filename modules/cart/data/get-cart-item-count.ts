import { unstable_rethrow } from "next/navigation";
import { logger } from "@/shared/lib/logger";

import { readCartCookie } from "../lib/cart-cookie";

// ============================================================================
// TYPES
// ============================================================================

type GetCartItemCountReturn = number;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre total d'articles dans le panier (badge de navigation).
 *
 * Somme des quantités du cookie `cart` — aucune requête, donc aucun cache : lire
 * un cookie est déjà l'opération la moins chère du rendu, et un `"use cache"` sur
 * une source dynamique n'aurait de toute façon pas été permis.
 *
 * ⚠️ Dérive assumée, comme pour le badge favoris : une ligne dont le VARIANT a été
 * supprimé ou dépublié depuis l'ajout compte encore ici alors que `getCart()`
 * l'écarte. Le badge peut donc annoncer un article de plus que ce que la
 * cart-sheet affiche, jusqu'à la prochaine mutation du panier.
 */
export async function getCartItemCount(): Promise<GetCartItemCountReturn> {
	try {
		const cart = await readCartCookie();
		return cart.items.reduce((sum, item) => sum + item.quantity, 0);
	} catch (e) {
		unstable_rethrow(e);
		logger.error("Failed to get cart item count", e, { service: "cart" });
		return 0;
	}
}
