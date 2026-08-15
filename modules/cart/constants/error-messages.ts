import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";

/**
 * Dictionnaire centralisé des messages d'erreur pour le système de panier
 * Tous les messages sont en français pour une expérience utilisateur cohérente
 */

export const CART_ERROR_MESSAGES = {
	// Erreurs liées au stock
	// Note: On ne divulgue pas le stock exact pour eviter les fuites d'information business
	INSUFFICIENT_STOCK: "Ce produit n'est plus disponible pour le moment",
	OUT_OF_STOCK: "Cet article n'est plus en stock",

	// Erreurs liées au produit/VARIANT
	PRODUCT_DELETED: "Ce produit n'existe plus dans notre catalogue",
	PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible à la vente",
	VARIANT_NOT_FOUND: "Produit introuvable",
	VARIANT_INACTIVE: "Ce produit n'est plus disponible",

	// Erreurs de quantité
	QUANTITY_MIN: "La quantité minimale est de 1",
	QUANTITY_MAX: `Quantité maximale : ${MAX_QUANTITY_PER_ORDER} par article. Pour une commande en gros, contactez-nous.`,

	// Erreurs de panier
	CART_ITEMS_LIMIT: (max: number) =>
		`Ton panier ne peut pas contenir plus de ${max} articles différents`,

	// Messages de validation pré-commande
	VALIDATION_FAILED: "Certains articles de ton panier ne sont plus disponibles",

	// Erreurs generales
	GENERAL_ERROR: "Une erreur est survenue lors de l'opération",
	INVALID_DATA: "Données invalides",

	// Erreurs panier / metadata
	CART_NOT_FOUND: "Panier introuvable",
	CART_EMPTY: "Ton panier est vide",
	CART_ALREADY_EMPTY: "Ton panier est déjà vide",

	// Erreurs code promo
	DISCOUNT_CODE_NOT_APPLIED: "Aucun code promo appliqué au panier",
} as const;
