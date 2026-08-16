import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";

/**
 * Dictionnaire centralisé des messages d'erreur pour le système de panier
 * Tous les messages sont en français pour une expérience utilisateur cohérente
 */

// Purge du 2026-08-15 (audit panier) : QUANTITY_MIN, VALIDATION_FAILED,
// GENERAL_ERROR, INVALID_DATA, CART_NOT_FOUND, CART_EMPTY, PRODUCT_DELETED et
// DISCOUNT_CODE_NOT_APPLIED n'avaient plus aucun consommateur — les trois
// derniers dataient d'états disparus du schéma lean (soft delete, table Cart,
// codes promo).
export const CART_ERROR_MESSAGES = {
	// Erreurs liées au stock
	// Note: On ne divulgue pas le stock exact pour eviter les fuites d'information business
	INSUFFICIENT_STOCK: "Ce produit n'est plus disponible pour le moment",
	OUT_OF_STOCK: "Cet article n'est plus en stock",

	// Erreurs liées au produit/VARIANT
	PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible à la vente",
	VARIANT_NOT_FOUND: "Produit introuvable",
	VARIANT_INACTIVE: "Ce produit n'est plus disponible",

	// Erreurs de quantité
	QUANTITY_MAX: `Quantité maximale : ${MAX_QUANTITY_PER_ORDER} par article. Pour une commande en gros, écris-nous.`,

	// Erreurs de panier
	CART_ITEMS_LIMIT: (max: number) =>
		`Ton panier ne peut pas contenir plus de ${max} articles différents`,
	CART_ALREADY_EMPTY: "Ton panier est déjà vide",
} as const;
