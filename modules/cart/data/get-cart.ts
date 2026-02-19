import { cacheLife, cacheTag } from "next/cache";
import { getCartSessionId } from "@/modules/cart/lib/cart-session";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";

import { GET_CART_SELECT } from "../constants/cart";
import { CART_CACHE_TAGS } from "../constants/cache";
import type { GetCartReturn, Cart, CartItem } from "../types/cart.types";

// Re-export pour compatibilité
export { GET_CART_SELECT } from "../constants/cart";
export type { GetCartReturn, Cart, CartItem } from "../types/cart.types";

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
		const userId = session?.user?.id;
		const sessionId = !userId ? await getCartSessionId() : null;

		return await fetchCart(userId, sessionId || undefined);
	} catch (error) {
		console.error("[getCart] Failed to fetch cart:", error);
		return null;
	}
}

/**
 * Récupère le panier de l'utilisateur ou du visiteur depuis la DB avec use cache
 */
export async function fetchCart(
	userId?: string,
	sessionId?: string
): Promise<GetCartReturn> {
	"use cache: private";
	cacheLife("cart");
	cacheTag(CART_CACHE_TAGS.CART(userId, sessionId));

	if (!userId && !sessionId) {
		return null;
	}

	const cart = await prisma.cart.findFirst({
		where: userId ? { userId } : { sessionId },
		select: GET_CART_SELECT,
	});

	// Si le panier est expiré, retourner null
	// Note: La suppression physique est gérée par le cron job quotidien
	// Voir: scripts/cleanup-expired-carts.ts (configurable via vercel.json)
	if (cart && cart.expiresAt && cart.expiresAt < new Date()) {
		return null;
	}

	return cart;
}
