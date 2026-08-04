import { WISHLIST_MAX_ITEMS } from "./wishlist.constants";

/**
 * Dictionnaire centralisé des messages d'erreur pour le système de wishlist
 * Tous les messages sont en français pour une expérience utilisateur cohérente
 */

export const WISHLIST_ERROR_MESSAGES = {
	ITEM_NOT_FOUND: "Cet article n'est pas dans tes favoris",
	WISHLIST_FULL: `Ta liste de favoris est pleine (${WISHLIST_MAX_ITEMS} articles max)`,
	PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible",
	GENERAL_ERROR: "Une erreur est survenue",
} as const;

// WISHLIST_NOT_FOUND et les sentinels WISHLIST_FULL/PRODUCT_NOT_PUBLIC sont
// partis avec la wishlist en base (2026-08-03) : plus de ligne `Wishlist` à
// chercher, plus de BusinessError transactionnelle — les actions travaillent
// directement sur le cookie.
