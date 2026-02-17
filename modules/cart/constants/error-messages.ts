import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";

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

	// Erreurs liées au produit/SKU
	PRODUCT_DELETED: "Ce produit n'existe plus dans notre catalogue",
	PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible à la vente",
	SKU_NOT_FOUND: "Produit introuvable",
	SKU_INACTIVE: "Ce produit n'est plus disponible",

	// Erreurs de quantité
	QUANTITY_MIN: "La quantité minimale est de 1",
	QUANTITY_MAX: `Quantité maximale : ${MAX_QUANTITY_PER_ORDER} par article. Pour une commande en gros, contactez-nous.`,

	// Erreurs de panier
	CART_ITEMS_LIMIT: (max: number) => `Votre panier ne peut pas contenir plus de ${max} articles différents`,

	// Messages de validation pré-commande
	VALIDATION_FAILED: "Certains articles de votre panier ne sont plus disponibles",

	// Erreurs générales
	GENERAL_ERROR: "Une erreur est survenue lors de l'opération",
	INVALID_DATA: "Données invalides",
} as const;
