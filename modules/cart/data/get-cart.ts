import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getCartSessionId } from "@/modules/cart/lib/cart-session";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getDiscountByCode } from "@/modules/discounts/data/get-discount-by-code";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { resolveCartDiscount } from "../services/resolve-cart-discount.service";

import { GET_CART_SELECT } from "../constants/cart";
import { CART_CACHE_TAGS } from "../constants/cache";
import type { GetCartReturn } from "../types/cart.types";

// Re-export pour compatibilité
export type { GetCartReturn } from "../types/cart.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le panier de l'utilisateur connecté ou du visiteur
 *
 * - Pour un utilisateur connecté : récupère via userId
 * - Pour un visiteur : récupère via sessionId (cookie)
 * - Inclut tous les items avec leurs détails produit/SKU
 *
 * @returns Le panier avec ses items, ou null si aucun panier n'existe
 */
export async function getCart(): Promise<GetCartReturn> {
	try {
		const session = await getSession();
		const userId = session?.user.id;
		const sessionId = !userId ? await getCartSessionId() : null;

		return await fetchCart(userId, sessionId ?? undefined);
	} catch (error) {
		unstable_rethrow(error);
		logger.error("[getCart] Failed to fetch cart:", error);
		return null;
	}
}

/**
 * Récupère le panier de l'utilisateur ou du visiteur depuis la DB avec use cache
 */
export async function fetchCart(userId?: string, sessionId?: string): Promise<GetCartReturn> {
	"use cache: private";
	cacheLife("checkout");
	cacheTag(CART_CACHE_TAGS.CART(userId, sessionId));

	if (!userId && !sessionId) {
		return null;
	}

	const cart = await prisma.cart.findFirst({
		where: {
			...(userId ? { userId } : { sessionId }),
			OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
		},
		select: GET_CART_SELECT,
	});

	if (!cart?.appliedDiscountCode) {
		return cart;
	}

	// [[CART-DISCOUNT-001]] Le montant de remise stocké est un snapshot figé à
	// l'application du code : on le re-dérive ici, seul point de lecture du
	// panier, pour qu'il suive toujours les articles réels (cf.
	// `resolve-cart-discount.service.ts`). On ne réécrit PAS la colonne — un
	// `"use cache"` ne doit pas muter la DB ; elle reste un simple indice, la
	// valeur affichée est celle retournée ici.
	const discount = await getDiscountByCode({ code: cart.appliedDiscountCode });

	// Le panier dépend désormais de ce discount : sans ce tag, une désactivation
	// ou un changement de valeur côté admin laisserait la remise affichée jusqu'à
	// l'expiration du profil `checkout`.
	cacheTag(DISCOUNT_CACHE_TAGS.DETAIL(cart.appliedDiscountCode));

	return {
		...cart,
		...resolveCartDiscount(cart.appliedDiscountCode, discount, cart.items),
	};
}
