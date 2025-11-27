/**
 * Cache configuration for SKUs module
 */

import { cacheLife, cacheTag } from "next/cache"
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache"
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache"

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les SKUs d'un produit
 */
export function cacheProductSkus(productId: string) {
	cacheLife("productDetail")
	cacheTag(PRODUCTS_CACHE_TAGS.SKUS(productId), PRODUCTS_CACHE_TAGS.SKUS_LIST)
}

/**
 * Configure le cache pour un SKU spécifique
 */
export function cacheSkuDetail(sku: string) {
	cacheLife("productDetail")
	cacheTag(PRODUCTS_CACHE_TAGS.SKU_DETAIL(sku), PRODUCTS_CACHE_TAGS.SKUS_LIST)
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
 * - Les SKUs du produit parent (si productId fourni)
 * - Le détail du produit parent (si productSlug fourni)
 * - La liste des produits (si productSlug fourni)
 * - L'inventaire dashboard
 * - Les badges de la sidebar (affecte le count d'inventaire critique)
 */
export function getSkuInvalidationTags(sku: string, productId?: string, productSlug?: string): string[] {
	const tags = [
		PRODUCTS_CACHE_TAGS.SKUS_LIST,
		PRODUCTS_CACHE_TAGS.SKU_DETAIL(sku),
		DASHBOARD_CACHE_TAGS.INVENTORY_LIST,
		DASHBOARD_CACHE_TAGS.BADGES,
	]

	if (productId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKUS(productId))
	}

	if (productSlug) {
		tags.push(PRODUCTS_CACHE_TAGS.DETAIL(productSlug), PRODUCTS_CACHE_TAGS.LIST)
	}

	return tags
}

/**
 * Tags à invalider lors de la modification des stocks
 *
 * Invalide uniquement les données affectées, pas toutes les listes.
 * Utile pour les mises à jour fréquentes de stock.
 */
export function getInventoryInvalidationTags(productSlug: string, productId: string): string[] {
	return [
		PRODUCTS_CACHE_TAGS.DETAIL(productSlug),
		PRODUCTS_CACHE_TAGS.SKUS(productId),
		DASHBOARD_CACHE_TAGS.INVENTORY_LIST,
		DASHBOARD_CACHE_TAGS.BADGES,
	]
}
