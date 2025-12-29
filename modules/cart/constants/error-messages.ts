/**
 * Dictionnaire centralisé des messages d'erreur pour le système de panier
 * Tous les messages sont en français pour une expérience utilisateur cohérente
 */

export const CART_ERROR_MESSAGES = {
	// Erreurs liées au stock
	// Note: On ne divulgue pas le stock exact pour eviter les fuites d'information business
	INSUFFICIENT_STOCK: (_available: number) =>
		"Ce produit n'est plus disponible pour le moment",
	OUT_OF_STOCK: "Cet article n'est plus en stock",
	STOCK_CHANGED: "Le stock a changé depuis votre dernière visite",

	// Erreurs liées au produit/SKU
	PRODUCT_INACTIVE: "Cet article n'est plus disponible à la vente",
	PRODUCT_DELETED: "Ce produit n'existe plus dans notre catalogue",
	PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible à la vente",
	SKU_NOT_FOUND: "Produit introuvable",
	SKU_INACTIVE: "Ce produit n'est plus disponible",

	// Erreurs de quantité
	INVALID_QUANTITY: "La quantité doit être comprise entre 1 et 99",
	QUANTITY_MIN: "La quantité minimale est de 1",
	QUANTITY_MAX: "Quantité maximale : 99 par article. Pour une commande en gros, contactez-nous.",
	QUANTITY_EXCEEDS_STOCK: (_available: number) =>
		"Quantité demandée supérieure au stock disponible",

	// Erreurs de panier
	CART_EXPIRED: "Votre panier a expiré. Veuillez ajouter vos articles à nouveau",
	CART_EMPTY: "Votre panier est vide",
	CART_ITEM_NOT_FOUND: "Article introuvable dans votre panier",

	// Erreurs de concurrence
	CONCURRENT_PURCHASE: "Désolé, cet article vient d'être acheté par quelqu'un d'autre",
	PRICE_CHANGED: "Le prix de cet article a été mis à jour",

	// Messages de validation pré-commande
	VALIDATION_FAILED: "Certains articles de votre panier ne sont plus disponibles",
	VALIDATION_REQUIRED: "Veuillez retirer ces articles ou ajuster les quantités pour continuer",

	// Erreurs générales
	GENERAL_ERROR: "Une erreur est survenue lors de l'opération",
	INVALID_DATA: "Données invalides",
	PERMISSION_DENIED: "Vous n'avez pas l'autorisation d'effectuer cette action",
} as const;

/**
 * Messages de succès
 */
export const CART_SUCCESS_MESSAGES = {
	ADDED_TO_CART: (productTitle: string) => `${productTitle} ajouté au panier`,
	QUANTITY_UPDATED: (quantity: number) => `Quantité mise à jour (${quantity})`,
	ITEM_REMOVED: "Article retiré du panier",
	CART_CLEARED: "Panier vidé",
	CARTS_MERGED: (count: number) => `Votre panier a été mis à jour avec ${count} article${count > 1 ? "s" : ""}`,
} as const;

/**
 * Messages d'avertissement pour le stock faible
 */
export const CART_WARNING_MESSAGES = {
	LOW_STOCK: (inventory: number) =>
		`Plus que ${inventory} en stock !`,
	SOME_ITEMS_UNAVAILABLE: "Certains articles n'ont pas pu être ajoutés (stock insuffisant)",
} as const;

/**
 * Messages informatifs
 */
export const CART_INFO_MESSAGES = {
	NO_GUEST_CART: "Aucun panier visiteur à fusionner",
	NO_ITEMS_TO_MERGE: "Aucun article à fusionner",
} as const;
