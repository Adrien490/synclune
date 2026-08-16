import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import type {
	CartValidationIssue,
	CartItemForValidation,
	AvailabilityCheckResult,
} from "../types/cart.types";

// ============================================================================
// CART ITEM AVAILABILITY SERVICE
// Pure functions for checking cart item availability
// ============================================================================

// Schéma lean : plus de soft delete. Une ligne dont le variant a disparu de la
// base est écartée en amont (`readCartWithVariants`, `getCart`) — il n'existe
// donc pas de prédicat « supprimé » ici, ni d'issueType « DELETED ».

/**
 * Vérifie si le VARIANT est inactif
 */
export function isCartItemVariantInactive(item: CartItemForValidation): boolean {
	return !item.variant.active;
}

/**
 * Vérifie si le produit n'est pas public
 */
export function isCartItemProductNotPublic(item: CartItemForValidation): boolean {
	return !item.variant.product.active;
}

/**
 * Rupture TOTALE : il n'en reste aucun.
 *
 * ⚠️ Ce prédicat et `hasInsufficientStock` forment une PARTITION délibérée de
 * « la ligne n'est pas servable » — ils sont mutuellement exclusifs, et aucun des
 * deux ne suffit seul à répondre « cette ligne passe-t-elle ? ». La partition
 * existe pour que `validate-cart` produise deux messages distincts (« épuisé » vs
 * « il n'en reste que N »).
 *
 * Pour le test global, utiliser `isCartItemUnavailable` (ou son équivalent UI
 * `isCartItemOutOfStock` dans `cart-item.service.ts`, qui couvre les deux cas d'un
 * seul `stock < quantity`).
 */
export function isCartItemZeroStock(item: CartItemForValidation): boolean {
	return item.variant.stock === 0;
}

/**
 * Stock insuffisant mais NON NUL — il en reste, juste pas assez.
 *
 * ⚠️ Le `&& stock > 0` n'est pas un oubli : il complète `isCartItemZeroStock`
 * (cf. la note ci-dessus). Ne PAS le retirer en croyant « corriger » un trou —
 * `validate-cart` classerait alors deux fois la même ligne.
 */
export function hasInsufficientStock(item: CartItemForValidation): boolean {
	return item.variant.stock < item.quantity && item.variant.stock > 0;
}

/**
 * Vérifie si un item de panier est indisponible (pour n'importe quelle raison)
 * Utilisé pour filtrer les items à supprimer
 */
export function isCartItemUnavailable(item: CartItemForValidation): boolean {
	return (
		isCartItemVariantInactive(item) ||
		isCartItemProductNotPublic(item) ||
		item.variant.stock < item.quantity
	);
}

/**
 * Vérifie la disponibilité complète d'un item et retourne l'issue détaillée si problème
 * Utilisé pour la validation complète du panier avec messages d'erreur
 */
export function checkCartItemAvailability(item: CartItemForValidation): AvailabilityCheckResult {
	// Vérifier l'activation du VARIANT
	if (isCartItemVariantInactive(item)) {
		return {
			isAvailable: false,
			issue: {
				variantId: item.variantId,
				productTitle: item.variant.product.name,
				issueType: "INACTIVE",
				message: CART_ERROR_MESSAGES.VARIANT_INACTIVE,
			},
		};
	}

	// Vérifier le statut du produit
	if (isCartItemProductNotPublic(item)) {
		return {
			isAvailable: false,
			issue: {
				variantId: item.variantId,
				productTitle: item.variant.product.name,
				issueType: "NOT_PUBLIC",
				message: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC,
			},
		};
	}

	// Vérifier la rupture de stock
	if (isCartItemZeroStock(item)) {
		return {
			isAvailable: false,
			issue: {
				variantId: item.variantId,
				productTitle: item.variant.product.name,
				issueType: "OUT_OF_STOCK",
				message: CART_ERROR_MESSAGES.OUT_OF_STOCK,
			},
		};
	}

	// Vérifier le stock insuffisant
	if (hasInsufficientStock(item)) {
		return {
			isAvailable: false,
			issue: {
				variantId: item.variantId,
				productTitle: item.variant.product.name,
				issueType: "INSUFFICIENT_STOCK",
				message: CART_ERROR_MESSAGES.INSUFFICIENT_STOCK,
			},
		};
	}

	return { isAvailable: true };
}

/**
 * Valide tous les items d'un panier et retourne la liste des issues
 */
export function validateCartItems(items: CartItemForValidation[]): CartValidationIssue[] {
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
export function filterUnavailableItems<T extends CartItemForValidation>(items: T[]): T[] {
	return items.filter(isCartItemUnavailable);
}
