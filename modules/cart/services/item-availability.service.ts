import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages"
import type {
	CartValidationIssue,
	CartItemForValidation,
	AvailabilityCheckResult,
} from "../types/cart.types"

export type { CartItemForValidation, AvailabilityCheckResult } from "../types/cart.types"

// ============================================================================
// CART ITEM AVAILABILITY SERVICE
// Pure functions for checking cart item availability
// ============================================================================

/**
 * Vérifie si le SKU ou le produit a été supprimé (soft delete)
 */
export function isCartItemDeleted(item: CartItemForValidation): boolean {
	return item.sku.deletedAt !== null || item.sku.product.deletedAt !== null;
}

/**
 * Vérifie si le SKU est inactif
 */
export function isCartItemSkuInactive(item: CartItemForValidation): boolean {
	return !item.sku.isActive;
}

/**
 * Vérifie si le produit n'est pas public
 */
export function isCartItemProductNotPublic(item: CartItemForValidation): boolean {
	return item.sku.product.status !== "PUBLIC";
}

/**
 * Vérifie si l'item est en rupture de stock totale
 */
export function isCartItemOutOfStock(item: CartItemForValidation): boolean {
	return item.sku.inventory === 0;
}

/**
 * Vérifie si le stock est insuffisant pour la quantité demandée
 */
export function hasInsufficientStock(item: CartItemForValidation): boolean {
	return item.sku.inventory < item.quantity && item.sku.inventory > 0;
}

/**
 * Vérifie si un item de panier est indisponible (pour n'importe quelle raison)
 * Utilisé pour filtrer les items à supprimer
 */
export function isCartItemUnavailable(item: CartItemForValidation): boolean {
	return (
		isCartItemDeleted(item) ||
		isCartItemSkuInactive(item) ||
		isCartItemProductNotPublic(item) ||
		item.sku.inventory < item.quantity
	);
}

/**
 * Vérifie la disponibilité complète d'un item et retourne l'issue détaillée si problème
 * Utilisé pour la validation complète du panier avec messages d'erreur
 */
export function checkCartItemAvailability(
	item: CartItemForValidation
): AvailabilityCheckResult {
	// Vérifier le SKU existe (ne devrait jamais arriver avec les contraintes DB)
	if (!item.sku) {
		return {
			isAvailable: false,
			issue: {
				cartItemId: item.id,
				skuId: item.skuId,
				productTitle: "Produit supprimé",
				issueType: "DELETED",
				message: CART_ERROR_MESSAGES.PRODUCT_DELETED,
			},
		};
	}

	// Vérifier les soft deletes
	if (isCartItemDeleted(item)) {
		return {
			isAvailable: false,
			issue: {
				cartItemId: item.id,
				skuId: item.skuId,
				productTitle: item.sku.product.title,
				issueType: "DELETED",
				message: CART_ERROR_MESSAGES.PRODUCT_DELETED,
			},
		};
	}

	// Vérifier l'activation du SKU
	if (isCartItemSkuInactive(item)) {
		return {
			isAvailable: false,
			issue: {
				cartItemId: item.id,
				skuId: item.skuId,
				productTitle: item.sku.product.title,
				issueType: "INACTIVE",
				message: CART_ERROR_MESSAGES.SKU_INACTIVE,
			},
		};
	}

	// Vérifier le statut du produit
	if (isCartItemProductNotPublic(item)) {
		return {
			isAvailable: false,
			issue: {
				cartItemId: item.id,
				skuId: item.skuId,
				productTitle: item.sku.product.title,
				issueType: "NOT_PUBLIC",
				message: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC,
			},
		};
	}

	// Vérifier la rupture de stock
	if (isCartItemOutOfStock(item)) {
		return {
			isAvailable: false,
			issue: {
				cartItemId: item.id,
				skuId: item.skuId,
				productTitle: item.sku.product.title,
				issueType: "OUT_OF_STOCK",
				message: CART_ERROR_MESSAGES.OUT_OF_STOCK,
				availableStock: 0,
			},
		};
	}

	// Vérifier le stock insuffisant
	if (hasInsufficientStock(item)) {
		return {
			isAvailable: false,
			issue: {
				cartItemId: item.id,
				skuId: item.skuId,
				productTitle: item.sku.product.title,
				issueType: "INSUFFICIENT_STOCK",
				message: CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(item.sku.inventory),
				availableStock: item.sku.inventory,
			},
		};
	}

	return { isAvailable: true };
}

/**
 * Valide tous les items d'un panier et retourne la liste des issues
 */
export function validateCartItems(
	items: CartItemForValidation[]
): CartValidationIssue[] {
	const issues: CartValidationIssue[] = [];

	for (const item of items) {
		const result = checkCartItemAvailability(item);
		if (!result.isAvailable && result.issue) {
			issues.push(result.issue);
		}
	}

	return issues;
}

/**
 * Filtre les items indisponibles d'une liste
 */
export function filterUnavailableItems<T extends CartItemForValidation>(
	items: T[]
): T[] {
	return items.filter(isCartItemUnavailable);
}
