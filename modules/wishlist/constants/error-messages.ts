/**
 * Dictionnaire centralisé des messages d'erreur pour le système de wishlist
 * Tous les messages sont en français pour une expérience utilisateur cohérente
 */

export const WISHLIST_ERROR_MESSAGES = {
	// Erreurs liées à la wishlist
	WISHLIST_NOT_FOUND: "Ta liste de souhaits n'existe pas",
	WISHLIST_EXPIRED: "Ta liste de souhaits a expiré. Connecte-toi pour la sauvegarder",

	// Erreurs liées aux articles
	ITEM_NOT_FOUND: "Cet article n'est pas dans ta wishlist",
	ITEM_ALREADY_IN_WISHLIST: "Cet article est déjà dans ta wishlist",
	WISHLIST_FULL: "Ta wishlist est pleine (500 articles max)",

	// Erreurs liées au produit/SKU
	SKU_NOT_FOUND: "Produit introuvable",
	SKU_INACTIVE: "Ce produit n'est plus disponible",
	PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible",

	// Erreurs de validation
	INVALID_SKU_ID: "Identifiant de produit invalide",
	INVALID_DATA: "Données invalides",

	// Erreurs générales
	GENERAL_ERROR: "Une erreur est survenue",
	PERMISSION_DENIED: "Tu n'as pas l'autorisation d'effectuer cette action",
} as const;

/**
 * Messages de succès
 */
export const WISHLIST_SUCCESS_MESSAGES = {
	ADDED_TO_WISHLIST: (productTitle: string) =>
		`${productTitle} ajouté à ta wishlist`,
	REMOVED_FROM_WISHLIST: (productTitle: string) =>
		`${productTitle} retiré de ta wishlist`,
	WISHLIST_CLEARED: "Ta wishlist a été vidée",
	WISHLISTS_MERGED: (count: number) =>
		`${count} article${count > 1 ? "s" : ""} ajouté${count > 1 ? "s" : ""} à ta wishlist`,
} as const;

/**
 * Messages d'avertissement
 */
export const WISHLIST_WARNING_MESSAGES = {
	OUT_OF_STOCK: "Cet article n'est plus en stock",
	LOW_STOCK: (inventory: number) => `Plus que ${inventory} en stock !`,
	PRICE_INCREASED: "Le prix a augmenté depuis l'ajout",
	PRICE_DECREASED: "Le prix a baissé depuis l'ajout",
} as const;

/**
 * Messages informatifs
 */
export const WISHLIST_INFO_MESSAGES = {
	SIGN_IN_TO_SAVE: "Connecte-toi pour sauvegarder ta wishlist",
	GUEST_WISHLIST_EXPIRES: (days: number) =>
		`Ta wishlist expirera dans ${days} jour${days > 1 ? "s" : ""}`,
	NO_GUEST_WISHLIST: "Aucune wishlist visiteur à fusionner",
	NO_ITEMS_TO_MERGE: "Aucun article à fusionner",
} as const;
