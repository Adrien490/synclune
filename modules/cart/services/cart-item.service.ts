/**
 * Service de calcul des propriétés d'un item du panier
 *
 * Ce module contient les fonctions pures pour :
 * - Calculer le sous-total d'un item
 * - Vérifier la disponibilité (stock, statut)
 * - Calculer les réductions
 */

import type { CartItem } from "../types/cart.types";

// ============================================================================
// CALCULS DE PRIX
// ============================================================================

/**
 * Calcule le sous-total d'un item (prix * quantité)
 */
export function getCartItemSubtotal(item: CartItem): number {
	return item.priceAtAdd * item.quantity;
}

// ============================================================================
// VÉRIFICATIONS DE DISPONIBILITÉ
// ============================================================================

/**
 * Vérifie si l'item est en rupture de stock
 */
export function isCartItemOutOfStock(item: CartItem): boolean {
	return item.sku.inventory < item.quantity;
}

/**
 * Vérifie si l'item est inactif (SKU désactivé ou produit non public)
 */
export function isCartItemInactive(item: CartItem): boolean {
	return !item.sku.isActive || item.sku.product.status !== "PUBLIC";
}

/**
 * Vérifie si l'item a un problème (rupture ou inactif)
 */
export function hasCartItemIssue(item: CartItem): boolean {
	return isCartItemOutOfStock(item) || isCartItemInactive(item);
}

// ============================================================================
// CALCULS DE RÉDUCTION
// ============================================================================

/**
 * Vérifie si l'item a une réduction
 */
export function hasCartItemDiscount(item: CartItem): boolean {
	return !!(item.sku.compareAtPrice && item.sku.compareAtPrice > item.priceAtAdd);
}

/**
 * Calcule le pourcentage de réduction
 */
export function getCartItemDiscountPercent(item: CartItem): number {
	if (!hasCartItemDiscount(item)) return 0;
	// Garde contre division par zéro (ne devrait pas arriver si hasCartItemDiscount est true)
	if (!item.sku.compareAtPrice || item.sku.compareAtPrice <= 0) return 0;
	return Math.round(
		((item.sku.compareAtPrice - item.priceAtAdd) / item.sku.compareAtPrice) * 100
	);
}

/**
 * Returns the issue label suffix for a cart item with stock/availability problems
 */
export function getCartItemIssueLabel(item: CartItem): string | null {
	if (isCartItemInactive(item)) return "indisponible";
	if (isCartItemOutOfStock(item)) return "rupture";
	return null;
}

// ============================================================================
// ACCESSEURS
// ============================================================================

/**
 * Récupère l'image principale du SKU
 */
export function getCartItemPrimaryImage(item: CartItem) {
	return item.sku.images[0] ?? null;
}
