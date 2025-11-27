import { cacheLife, cacheTag } from "next/cache";
import { getCartSessionId } from "@/shared/utils/cart-session";
import { getSession } from "@/shared/utils/get-session";
import { prisma } from "@/shared/lib/prisma";

import { GET_CART_SELECT } from "../constants/cart.constants";
import type { GetCartReturn, Cart, CartItem } from "../types/cart.types";

// Re-export pour compatibilité
export { GET_CART_SELECT } from "../constants/cart.constants";
export type { GetCartReturn, Cart, CartItem, CartWithItems } from "../types/cart.types";

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
	const session = await getSession();
	const userId = session?.user?.id;
	const sessionId = !userId ? await getCartSessionId() : null;

	return await fetchCart(userId, sessionId || undefined);
}

/**
 * Récupère le panier de l'utilisateur ou du visiteur depuis la DB avec use cache: private
 */
export async function fetchCart(
	userId?: string,
	sessionId?: string
): Promise<GetCartReturn> {
	"use cache: private";
	cacheLife({ stale: 300 });

	cacheTag(
		userId
			? `cart-user-${userId}`
			: sessionId
				? `cart-session-${sessionId}`
				: "cart-anonymous"
	);

	if (!userId && !sessionId) {
		return null;
	}

	const cart = await prisma.cart.findFirst({
		where: userId ? { userId } : { sessionId },
		select: GET_CART_SELECT,
	});

	// Si le panier est expiré, retourner null
	// Note: La suppression des paniers expirés doit être gérée par un cron job
	// ou une action dédiée dans cart/actions/, pas dans une query
	if (cart && cart.expiresAt && cart.expiresAt < new Date()) {
		return null;
	}

	return cart;
}
