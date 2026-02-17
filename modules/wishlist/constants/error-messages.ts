/**
 * Sentinel string for WISHLIST_FULL errors thrown inside transactions.
 * Using a constant prevents silent breakage from typos.
 */
export const WISHLIST_FULL_SENTINEL = "WISHLIST_FULL";

/**
 * Dictionnaire centralisé des messages d'erreur pour le système de wishlist
 * Tous les messages sont en français pour une expérience utilisateur cohérente
 */

export const WISHLIST_ERROR_MESSAGES = {
	WISHLIST_NOT_FOUND: "Votre liste de souhaits n'existe pas",
	ITEM_NOT_FOUND: "Cet article n'est pas dans votre wishlist",
	WISHLIST_FULL: "Votre wishlist est pleine (500 articles max)",
	PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible",
	GENERAL_ERROR: "Une erreur est survenue",
} as const;

/**
 * Messages informatifs
 */
export const WISHLIST_INFO_MESSAGES = {
	SIGN_IN_TO_SAVE: "Connectez-vous pour sauvegarder votre wishlist",
	GUEST_WISHLIST_EXPIRES: (days: number) =>
		`Votre wishlist expirera dans ${days} jour${days > 1 ? "s" : ""}`,
	NO_GUEST_WISHLIST: "Aucune wishlist visiteur à fusionner",
	NO_ITEMS_TO_MERGE: "Aucun article à fusionner",
} as const;
