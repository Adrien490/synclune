/**
 * Sentinel string for WISHLIST_FULL errors thrown inside transactions.
 * Using a constant prevents silent breakage from typos.
 */
export const WISHLIST_FULL_SENTINEL = "WISHLIST_FULL";

/**
 * Sentinel string for PRODUCT_NOT_PUBLIC errors thrown inside transactions.
 * Using a constant prevents silent breakage from typos.
 */
export const PRODUCT_NOT_PUBLIC_SENTINEL = "PRODUCT_NOT_PUBLIC";

/**
 * Dictionnaire centralisé des messages d'erreur pour le système de wishlist
 * Tous les messages sont en français pour une expérience utilisateur cohérente
 */

export const WISHLIST_ERROR_MESSAGES = {
	WISHLIST_NOT_FOUND: "Votre liste de favoris n'existe pas",
	ITEM_NOT_FOUND: "Cet article n'est pas dans vos favoris",
	WISHLIST_FULL: "Votre liste de favoris est pleine (500 articles max)",
	PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible",
	GENERAL_ERROR: "Une erreur est survenue",
} as const;

// WISHLIST_INFO_MESSAGES retiré (audit wishlist 2026-08-01) : ses messages
// dataient de la fusion post-login (« à fusionner », « Connectez-vous… »),
// supprimée avec l'espace client — plus aucun caller. Les clés SKU_*/stock
// sont parties avec `move-to-cart` (action RPC sans appelant UI).
