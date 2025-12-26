/**
 * Helpers de cache pour le module SKUs
 *
 * Note: Ce module utilise PRODUCTS_CACHE_TAGS car les SKUs sont liés aux produits.
 */

import { cacheLife, cacheTag, updateTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// TYPES
// ============================================

/**
 * Type pour les données SKU nécessaires à l'invalidation bulk
 */
export interface SkuDataForInvalidation {
	id: string;
	sku: string;
	productId: string;
	product: { slug: string };
}

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les SKUs d'un produit
 */
export function cacheProductSkus(productId: string) {
	cacheLife("productDetail");
	cacheTag(PRODUCTS_CACHE_TAGS.SKUS(productId), PRODUCTS_CACHE_TAGS.SKUS_LIST);
}

/**
 * Configure le cache pour un SKU spécifique
 */
export function cacheSkuDetail(sku: string) {
	cacheLife("productDetail");
	cacheTag(PRODUCTS_CACHE_TAGS.SKU_DETAIL(sku), PRODUCTS_CACHE_TAGS.SKUS_LIST);
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification d'un SKU
 *
 * Invalide automatiquement :
 * - La liste globale des SKUs
 * - Le détail du SKU
 * - Le stock temps réel du SKU (si skuId fourni)
 * - Les SKUs du produit parent (si productId fourni)
 * - Le détail du produit parent (si productSlug fourni)
 * - La liste des produits (si productSlug fourni)
 * - L'inventaire dashboard
 * - Les badges de la sidebar (affecte le count d'inventaire critique)
 */
export function getSkuInvalidationTags(sku: string, productId?: string, productSlug?: string, skuId?: string): string[] {
	const tags = [
		PRODUCTS_CACHE_TAGS.SKUS_LIST,
		PRODUCTS_CACHE_TAGS.SKU_DETAIL(sku),
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];

	// Invalider le cache stock temps réel si skuId fourni
	if (skuId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
	}

	if (productId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKUS(productId));
	}

	if (productSlug) {
		tags.push(PRODUCTS_CACHE_TAGS.DETAIL(productSlug), PRODUCTS_CACHE_TAGS.LIST);
	}

	return tags;
}

/**
 * Tags à invalider lors de la modification des stocks
 *
 * Invalide uniquement les données affectées, pas toutes les listes.
 * Utile pour les mises à jour fréquentes de stock.
 */
export function getInventoryInvalidationTags(productSlug: string, productId: string, skuIds?: string[]): string[] {
	const tags = [
		PRODUCTS_CACHE_TAGS.DETAIL(productSlug),
		PRODUCTS_CACHE_TAGS.SKUS(productId),
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];

	// Invalider le cache stock temps réel de chaque SKU
	if (skuIds) {
		for (const skuId of skuIds) {
			tags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
		}
	}

	return tags;
}

/**
 * Collecte et déduplique les tags à invalider pour plusieurs SKUs
 *
 * Optimise les opérations bulk en évitant les invalidations dupliquées
 * (ex: plusieurs SKUs du même produit ne génèrent qu'une seule invalidation produit)
 *
 * @param skusData - Tableau de SKUs avec leurs données produit
 * @returns Set de tags uniques à invalider
 */
export function collectBulkInvalidationTags(skusData: SkuDataForInvalidation[]): Set<string> {
	const uniqueTags = new Set<string>();

	for (const skuData of skusData) {
		const tags = getSkuInvalidationTags(
			skuData.sku,
			skuData.productId,
			skuData.product.slug,
			skuData.id
		);
		tags.forEach((tag) => uniqueTags.add(tag));
	}

	return uniqueTags;
}

/**
 * Invalide tous les tags d'un Set en une seule passe
 *
 * @param tags - Set de tags à invalider
 */
export function invalidateTags(tags: Set<string>): void {
	tags.forEach((tag) => updateTag(tag));
}
