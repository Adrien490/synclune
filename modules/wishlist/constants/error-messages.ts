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
	WISHLIST_ALREADY_EMPTY: "Votre liste de favoris est déjà vide",
	SKU_NOT_FOUND: "Variante introuvable",
	SKU_INACTIVE: "Cette variante n'est plus disponible",
	OUT_OF_STOCK: "Cet article n'est plus en stock",
	INSUFFICIENT_STOCK: "Stock insuffisant pour cet article",
	UNAUTHORIZED: "Non autorisé",
	GENERAL_ERROR: "Une erreur est survenue",
} as const;

/**
 * Messages informatifs
 */
export const WISHLIST_INFO_MESSAGES = {
	SIGN_IN_TO_SAVE: "Connectez-vous pour sauvegarder vos favoris",
	GUEST_WISHLIST_EXPIRES: (days: number) =>
		`Vos favoris expireront dans ${days} jour${days > 1 ? "s" : ""}`,
	NO_GUEST_WISHLIST: "Aucun favori visiteur à fusionner",
	NO_ITEMS_TO_MERGE: "Aucun article à fusionner",
} as const;
