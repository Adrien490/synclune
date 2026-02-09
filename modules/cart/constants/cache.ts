/**
 * Tags de cache pour le module Cart
 *
 * Fonctions: voir utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const CART_CACHE_TAGS = {
	/** Panier d'un utilisateur ou visiteur */
	CART: (userId?: string, sessionId?: string) =>
		userId ? `cart-user-${userId}` : sessionId ? `cart-session-${sessionId}` : "cart-anonymous",

	/** Compteur d'items dans le panier */
	COUNT: (userId?: string, sessionId?: string) =>
		userId ? `cart-count-user-${userId}` : sessionId ? `cart-count-session-${sessionId}` : "cart-count-anonymous",

	/** Résumé du panier (pour tableau de bord) */
	SUMMARY: (userId?: string, sessionId?: string) =>
		userId ? `cart-summary-user-${userId}` : sessionId ? `cart-summary-session-${sessionId}` : "cart-summary-anonymous",

	/** Compteur de paniers contenant un produit (pour FOMO "dans X paniers") */
	PRODUCT_CARTS: (productId: string) => `product-carts-${productId}`,
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheCart,
	cacheCartSummary,
	getCartInvalidationTags,
} from "../utils/cache";
