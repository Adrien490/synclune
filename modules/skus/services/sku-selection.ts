/**
 * Services de sélection et calcul de stock des SKUs
 *
 * Ce module contient la logique métier pour :
 * - Sélectionner le SKU principal d'un produit
 * - Sélectionner un SKU par couleur
 * - Calculer les informations de stock
 */

import type {
	ProductFromList,
	SkuFromList,
} from "@/modules/products/types/product-list.types";
import type {
	StockStatus,
	ProductStockInfo,
} from "@/modules/skus/types/sku-selection.types";

/**
 * Calcule les informations de stock à partir d'un tableau de SKUs.
 * Fonction utilitaire générique pour tout contexte (produits, related, cart).
 *
 * @param skus - Tableau de SKUs avec au minimum { inventory: number }
 * @returns Infos stock formatées pour ProductCard
 */
export function computeStockFromSkus<T extends { inventory: number }>(
	skus: T[]
): ProductStockInfo {
	const totalInventory = skus.reduce((sum, sku) => sum + sku.inventory, 0);
	const availableSkus = skus.filter((sku) => sku.inventory > 0).length;

	let status: StockStatus;
	let message: string;

	if (totalInventory === 0) {
		status = "out_of_stock";
		message = "Rupture de stock";
	} else {
		status = "in_stock";
		message = "En stock";
	}

	return {
		status,
		totalInventory,
		availableSkus,
		message,
	};
}

/**
 * Récupère le SKU principal pour les listes (logique de sélection intelligente)
 *
 * Ordre de priorité :
 * 1. SKU avec isDefault = true et actif
 * 2. Premier SKU en stock, trié par prix croissant
 * 3. Premier SKU actif
 * 4. Premier SKU (fallback)
 */
export function getPrimarySkuForList(
	product: ProductFromList
): SkuFromList | null {
	if (!product.skus || product.skus.length === 0) {
		return null;
	}

	// 1. SKU avec isDefault = true
	const defaultFlagSku = product.skus.find(
		(sku) => sku.isActive && sku.isDefault
	);
	if (defaultFlagSku) return defaultFlagSku;

	// 2. SKU en stock, trié par priceInclTax ASC
	const inStockSkus = product.skus
		.filter((sku) => sku.isActive && sku.inventory > 0)
		.sort((a, b) => a.priceInclTax - b.priceInclTax);

	if (inStockSkus.length > 0) return inStockSkus[0];

	// 3. Premier SKU actif
	const activeSku = product.skus.find((sku) => sku.isActive);
	return activeSku || product.skus[0];
}

/**
 * Récupère le SKU correspondant à une couleur sélectionnée
 * Fallback sur le SKU principal si la couleur n'existe pas ou n'est pas active
 *
 * @param product - Produit avec ses SKUs
 * @param colorSlug - Slug de la couleur sélectionnée (ou null)
 * @returns SKU correspondant ou SKU principal en fallback
 */
export function getSkuByColorForList(
	product: ProductFromList,
	colorSlug: string | null
): SkuFromList | null {
	if (!colorSlug || !product.skus) {
		return getPrimarySkuForList(product);
	}

	const skuWithColor = product.skus.find(
		(sku) => sku.color?.slug === colorSlug && sku.isActive
	);

	return skuWithColor ?? getPrimarySkuForList(product);
}

/**
 * Récupère les informations de stock du produit
 */
export function getStockInfoForList(product: ProductFromList): ProductStockInfo {
	const activeSkus = product.skus?.filter((sku) => sku.isActive) || [];
	const totalInventory = activeSkus.reduce((sum, sku) => sum + sku.inventory, 0);
	const availableSkus = activeSkus.filter((sku) => sku.inventory > 0).length;

	let status: StockStatus;
	let message: string;

	// Système simplifié : en stock ou rupture de stock
	if (totalInventory === 0) {
		status = "out_of_stock";
		message = "Rupture de stock";
	} else {
		status = "in_stock";
		message = "En stock";
	}

	return {
		status,
		totalInventory,
		availableSkus,
		message,
	};
}

// Ré-export des types pour faciliter les imports
export type { StockStatus, ProductStockInfo } from "@/modules/skus/types/sku-selection.types";
