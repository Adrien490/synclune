import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { readCartCookie } from "../lib/cart-cookie";

import { CART_VARIANT_SELECT } from "../constants/cart";
import type { CartItem, CartItemVariant, GetCartReturn } from "../types/cart.types";

// Re-export pour compatibilité
export type { GetCartReturn } from "../types/cart.types";

const EMPTY_CART: GetCartReturn = { items: [] };

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le panier du visiteur.
 *
 * Les lignes (VARIANT, quantité, prix témoin) et le code promo viennent du cookie
 * `cart` — SSOT depuis le retrait de la base (2026-08-04). Seule la
 * matérialisation des VARIANTs passe par la DB. Une ligne dont le VARIANT a disparu, a
 * été soft-deleted ou dont le produit est supprimé est silencieusement écartée
 * (même comportement que l'ancien filtre de relation de `GET_CART_SELECT`).
 *
 * ⚠️ Le panier n'est plus jamais `null` : sans cookie, il est simplement vide.
 */
export async function getCart(): Promise<GetCartReturn> {
	try {
		const cookieCart = await readCartCookie();

		if (cookieCart.items.length === 0) {
			return EMPTY_CART;
		}

		const variants = await fetchCartVariants(cookieCart.items.map((item) => item.variantId));
		const byVariantId = new Map(variants.map((variant) => [variant.id, variant]));

		// L'ordre du cookie fait foi (le plus récemment ajouté en tête), ce qui
		// reproduit l'`orderBy: { createdAt: "desc" }` de l'ancien select.
		const items: CartItem[] = cookieCart.items.flatMap((item) => {
			const variant = byVariantId.get(item.variantId);
			if (!variant) return [];
			return [
				{ id: item.variantId, quantity: item.quantity, priceAtAdd: item.priceAtAdd, variant },
			];
		});

		if (items.length === 0) {
			return EMPTY_CART;
		}

		return { items };
	} catch (error) {
		unstable_rethrow(error);
		// Le repli vit ICI, HORS du scope "use cache" de `fetchCartVariants` — sinon le
		// panier vide d'une panne serait mis en cache (CACHE-DEGRADED-VALUE-001).
		logger.error("[getCart] Failed to fetch cart:", error);
		return EMPTY_CART;
	}
}

/**
 * Matérialise une liste de VARIANT IDs en VARIANTs lisibles, pour le rendu du panier.
 *
 * Cache PUBLIC volontaire : la clé d'une entrée `"use cache"` est construite sur
 * les ARGUMENTS — ici des VARIANT IDs, du catalogue pur. Rien de personnel n'est
 * retourné (la liste elle-même vient du cookie de l'appelante, jamais du cache),
 * donc pas de `"use cache: private"` — qui coûterait une requête en base à chaque
 * rendu et exclurait le panier du shell statique.
 *
 * Profil `checkout` (et non `catalog`) : le panier affiche le stock et pilote les
 * alertes de rupture, il ne peut pas tolérer 15 min de péremption. Tags
 * `PRODUCTS_LIST` + `VARIANTS_LIST`, ceux que posent les mutations catalogue
 * susceptibles de changer un prix, un stock ou une disponibilité.
 */
async function fetchCartVariants(variantIds: string[]): Promise<CartItemVariant[]> {
	"use cache";
	cacheLife("checkout");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);
	cacheTag(PRODUCTS_CACHE_TAGS.VARIANTS_LIST);

	// ⚠️ AUCUN try/catch dans ce scope : le repli appartient à `getCart`, hors du
	// cache — sinon le vide d'une panne est mis en cache pour toute la fenêtre du
	// profil. Même motif que `get-products.ts` et `get-wishlist.ts`.
	return await prisma.productVariant.findMany({
		where: {
			id: { in: variantIds },
			product: {},
		},
		select: CART_VARIANT_SELECT,
	});
}
