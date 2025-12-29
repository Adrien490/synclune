/**
 * Service de calcul des prix du panier
 *
 * Ce module contient les fonctions pures pour :
 * - Détecter les changements de prix depuis l'ajout au panier
 * - Calculer les économies potentielles
 * - Catégoriser les changements (hausse/baisse)
 */

import type {
	CartItemForPriceCheck,
	PriceChangeResult,
} from "../types/cart.types"

export type { CartItemForPriceCheck, PriceChangeResult } from "../types/cart.types"

// ============================================================================
// CART PRICING CALCULATOR SERVICE
// Pure functions for detecting and calculating price changes
// ============================================================================

/**
 * Détecte tous les changements de prix dans les articles du panier
 *
 * Compare priceAtAdd (snapshot à l'ajout) vs sku.priceInclTax (prix actuel)
 *
 * @param items - Articles du panier
 * @returns Résultat détaillé des changements de prix
 */
export function detectPriceChanges<T extends CartItemForPriceCheck>(
	items: T[]
): PriceChangeResult<T> {
	const itemsWithPriceChange = items.filter(
		(item) => item.priceAtAdd !== item.sku.priceInclTax
	);

	const itemsWithPriceIncrease = itemsWithPriceChange.filter(
		(item) => item.sku.priceInclTax > item.priceAtAdd
	);

	const itemsWithPriceDecrease = itemsWithPriceChange.filter(
		(item) => item.sku.priceInclTax < item.priceAtAdd
	);

	const totalSavings = itemsWithPriceDecrease.reduce(
		(sum, item) =>
			sum + (item.priceAtAdd - item.sku.priceInclTax) * item.quantity,
		0
	);

	const totalIncrease = itemsWithPriceIncrease.reduce(
		(sum, item) =>
			sum + (item.sku.priceInclTax - item.priceAtAdd) * item.quantity,
		0
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
 * Vérifie si des articles ont des prix qui ont changé
 *
 * @param items - Articles du panier
 * @returns true si au moins un prix a changé
 */
export function hasPriceChanges(items: CartItemForPriceCheck[]): boolean {
	return items.some((item) => item.priceAtAdd !== item.sku.priceInclTax);
}

/**
 * Calcule les économies potentielles sur les baisses de prix
 *
 * @param items - Articles du panier
 * @returns Montant total économisable
 */
export function calculateTotalSavings(items: CartItemForPriceCheck[]): number {
	return items
		.filter((item) => item.sku.priceInclTax < item.priceAtAdd)
		.reduce(
			(sum, item) =>
				sum + (item.priceAtAdd - item.sku.priceInclTax) * item.quantity,
			0
		);
}

/**
 * Détermine si un article a subi une hausse de prix
 *
 * @param item - Article du panier
 * @returns true si le prix a augmenté
 */
export function isPriceIncrease(item: CartItemForPriceCheck): boolean {
	return item.sku.priceInclTax > item.priceAtAdd;
}

/**
 * Détermine si un article a subi une baisse de prix
 *
 * @param item - Article du panier
 * @returns true si le prix a baissé
 */
export function isPriceDecrease(item: CartItemForPriceCheck): boolean {
	return item.sku.priceInclTax < item.priceAtAdd;
}

/**
 * Calcule la différence de prix pour un article
 *
 * @param item - Article du panier
 * @returns Différence (positive si hausse, négative si baisse)
 */
export function getPriceDifference(item: CartItemForPriceCheck): number {
	return (item.sku.priceInclTax - item.priceAtAdd) * item.quantity;
}
