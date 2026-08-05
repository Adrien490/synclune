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
 * L'item n'est pas servable en l'état : stock strictement inférieur à la quantité,
 * rupture totale incluse.
 *
 * Prédicat UNIQUE, volontairement plus grossier que la partition
 * `isCartItemZeroStock` / `hasInsufficientStock` d'`item-availability.service.ts` :
 * l'UI a besoin d'un booléen « cette ligne pose problème » pour son badge, le
 * serveur a besoin de la partition pour choisir son message. Les deux sont d'accord
 * sur le total — `inventory < quantity` de part et d'autre.
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
	return Math.round(((item.sku.compareAtPrice - item.priceAtAdd) / item.sku.compareAtPrice) * 100);
}

/**
 * SSOT du libellé d'un problème de disponibilité, pour TOUTES les surfaces.
 *
 * ⚠️ Il y avait trois formulations pour deux états : cette fonction rendait
 * `"rupture"` / `"indisponible"` (minuscules) pour la liste de l'en-tête du panier,
 * tandis que les pastilles de `cart-sheet-item-row.tsx` codaient en dur `"Rupture"` /
 * `"Plus disponible"`. Même état, trois mots — le client lisait « rupture » en haut et
 * « Rupture » à côté de l'article, et « indisponible » vs « Plus disponible ».
 *
 * Les libellés sont désormais ceux des pastilles (les plus explicites) et servent les
 * deux surfaces. La casse est portée par le libellé lui-même : l'en-tête l'insère entre
 * parenthèses, ce qui accepte une capitale.
 */
export const CART_ITEM_ISSUE_LABELS = {
	inactive: "Plus disponible",
	outOfStock: "Rupture",
} as const;

export function getCartItemIssueLabel(item: CartItem): string | null {
	if (isCartItemInactive(item)) return CART_ITEM_ISSUE_LABELS.inactive;
	if (isCartItemOutOfStock(item)) return CART_ITEM_ISSUE_LABELS.outOfStock;
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
