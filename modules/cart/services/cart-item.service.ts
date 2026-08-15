/**
 * Service de calcul des propriétés d'un item du panier
 *
 * Ce module contient les fonctions pures pour :
 * - Calculer le sous-total d'un item
 * - Vérifier la disponibilité (stock, statut)
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
 * sur le total — `stock < quantity` de part et d'autre.
 */
export function isCartItemOutOfStock(item: CartItem): boolean {
	return item.variant.stock < item.quantity;
}

/**
 * Vérifie si l'item est inactif (VARIANT désactivé ou produit non public)
 */
export function isCartItemInactive(item: CartItem): boolean {
	return !item.variant.active || !item.variant.product.active;
}

/**
 * Vérifie si l'item a un problème (rupture ou inactif)
 */
export function hasCartItemIssue(item: CartItem): boolean {
	return isCartItemOutOfStock(item) || isCartItemInactive(item);
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
 * Récupère l'image principale de la ligne — schéma lean : le média vit sur le
 * PRODUIT (CART_VARIANT_SELECT filtre IMAGE + ordre canonique, take 1).
 */
export function getCartItemPrimaryImage(item: CartItem) {
	return item.variant.product.media[0] ?? null;
}
