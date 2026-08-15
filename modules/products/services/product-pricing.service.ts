/**
 * Service de calcul des prix produits
 *
 * Ce module contient les fonctions pures pour :
 * - Calculer la plage de prix (min/max) des VARIANTs
 * - Déterminer le statut de stock
 * - Calculer les pourcentages de réduction
 * - Générer les URLs Schema.org pour la disponibilité
 */

import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import type { StockStatus, PriceInfo, VariantForPricing } from "../types/product-services.types";

// ============================================================================
// PRODUCT PRICING SERVICE
// Pure functions for price calculations and stock status
// ============================================================================

/**
 * Calcule les informations de prix à partir des variantes.
 *
 * Schéma lean : le prix effectif d'une variante est son override
 * `priceCents`, sinon le prix du produit (`basePriceCents`).
 *
 * @param variants - Liste des variantes du produit
 * @param basePriceCents - Prix du produit (hérité quand l'override est null)
 * @returns Informations de prix (min, max, hasMultiplePrices)
 */
export function calculatePriceInfo(
	variants: VariantForPricing[] | undefined | null,
	basePriceCents = 0,
): PriceInfo {
	if (!variants || variants.length === 0) {
		return { minPrice: basePriceCents, maxPrice: basePriceCents, hasMultiplePrices: false };
	}

	const activePrices = variants
		.filter((variant) => variant.active)
		.map((variant) => variant.priceCents ?? basePriceCents);

	if (activePrices.length === 0) {
		return { minPrice: basePriceCents, maxPrice: basePriceCents, hasMultiplePrices: false };
	}

	const minPrice = Math.min(...activePrices);
	const maxPrice = Math.max(...activePrices);
	const hasMultiplePrices = minPrice !== maxPrice;

	return { minPrice, maxPrice, hasMultiplePrices };
}

/**
 * Détermine le statut de stock d'un VARIANT
 *
 * @param stock - Quantité en stock
 * @param isActive - Si le VARIANT est actif
 * @returns Statut de stock (in_stock, low_stock, out_of_stock)
 */
export function determineStockStatus(
	stock: number | undefined | null,
	isActive: boolean | undefined | null,
): StockStatus {
	const qty = stock ?? 0;
	const active = isActive ?? false;

	if (!active || qty === 0) {
		return "out_of_stock";
	}

	if (qty <= STOCK_THRESHOLDS.LOW) {
		return "low_stock";
	}

	return "in_stock";
}

/**
 * Retourne l'URL Schema.org pour le statut de disponibilité
 *
 * @param stockStatus - Statut de stock
 * @returns URL Schema.org
 */
export function getSchemaOrgAvailabilityUrl(stockStatus: StockStatus): string {
	switch (stockStatus) {
		case "out_of_stock":
			return "https://schema.org/OutOfStock";
		case "low_stock":
			return "https://schema.org/LimitedAvailability";
		case "in_stock":
		default:
			return "https://schema.org/InStock";
	}
}
