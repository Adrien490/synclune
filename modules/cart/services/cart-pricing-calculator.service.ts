/**
 * Service de calcul des prix du panier
 *
 * Ce module contient les fonctions pures pour :
 * - Détecter les changements de prix depuis l'ajout au panier
 * - Calculer les économies potentielles
 * - Catégoriser les changements (hausse/baisse)
 */

import type { CartItemForPriceCheck, PriceChangeResult } from "../types/cart.types";

/** Prix effectif d'une variante : override, sinon prix du produit. */
export function effectivePrice(item: CartItemForPriceCheck): number {
	return item.variant.priceCents ?? item.variant.product.priceCents;
}

// ============================================================================
// CART PRICING CALCULATOR SERVICE
// Pure functions for detecting and calculating price changes
// ============================================================================

/**
 * Détecte tous les changements de prix dans les articles du panier
 *
 * Compare priceAtAdd (snapshot à l'ajout) vs variant.priceCents (prix actuel)
 *
 * @param items - Articles du panier
 * @returns Résultat détaillé des changements de prix
 */
export function detectPriceChanges<T extends CartItemForPriceCheck>(
	items: T[],
): PriceChangeResult<T> {
	const itemsWithPriceChange = items.filter((item) => item.priceAtAdd !== effectivePrice(item));

	const itemsWithPriceIncrease = itemsWithPriceChange.filter(
		(item) => effectivePrice(item) > item.priceAtAdd,
	);

	const itemsWithPriceDecrease = itemsWithPriceChange.filter(
		(item) => effectivePrice(item) < item.priceAtAdd,
	);

	const totalSavings = itemsWithPriceDecrease.reduce(
		(sum, item) => sum + (item.priceAtAdd - effectivePrice(item)) * item.quantity,
		0,
	);

	const totalIncrease = itemsWithPriceIncrease.reduce(
		(sum, item) => sum + (effectivePrice(item) - item.priceAtAdd) * item.quantity,
		0,
	);

	return {
		itemsWithPriceChange,
		itemsWithPriceIncrease,
		itemsWithPriceDecrease,
		totalSavings,
		totalIncrease,
	};
}

/**
 * Détermine si un article a subi une hausse de prix
 *
 * @param item - Article du panier
 * @returns true si le prix a augmenté
 */
export function isPriceIncrease(item: CartItemForPriceCheck): boolean {
	return effectivePrice(item) > item.priceAtAdd;
}

// `hasPriceChanges`, `calculateTotalSavings`, `isPriceDecrease` et
// `getPriceDifference` ont été retirées (audit panier 2026-08-15) : aucun
// consommateur de production — seuls leurs tests les maintenaient en vie, ce
// qui rendait `knip` aveugle. `detectPriceChanges` couvre tous ces besoins.
