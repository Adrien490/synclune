/**
 * Cache configuration for Products module
 */

import { cacheLife, cacheTag } from "next/cache"
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache"

// ============================================
// CACHE TAGS
// ============================================

export const PRODUCTS_CACHE_TAGS = {
	/** Liste complète des produits */
	LIST: "products-list",

	/** Détail d'un produit spécifique */
	DETAIL: (slug: string) => `product-${slug}`,

	/** SKUs d'un produit */
	SKUS: (productId: string) => `product-${productId}-skus`,

	/** Prix maximum des produits (pour filtres) */
	MAX_PRICE: "max-product-price",

	/** Compteurs de produits par statut (dashboard) */
	COUNTS: "product-counts",

	/** Liste globale des SKUs */
	SKUS_LIST: "skus",

	/** Détail d'un SKU spécifique */
	SKU_DETAIL: (sku: string) => `sku-${sku}`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les listes de produits
 * - Utilisé pour : /products, recherches, filtres
 * - Durée : 1h fraîche, 15min revalidation, 1j expiration
 */
export function cacheProducts() {
	cacheLife("products")
	cacheTag(PRODUCTS_CACHE_TAGS.LIST)
}

/**
 * Configure le cache pour le détail d'un produit
 * - Utilisé pour : /products/[slug]
 * - Durée : 30min fraîche, 10min revalidation, 12h expiration
 */
export function cacheProductDetail(slug: string) {
	cacheLife("productDetail")
	cacheTag(PRODUCTS_CACHE_TAGS.DETAIL(slug), PRODUCTS_CACHE_TAGS.LIST)
}

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
 * Tags à invalider lors de la modification d'un produit
 *
 * Invalide automatiquement :
 * - La liste des produits
 * - Le détail du produit
 * - Les SKUs du produit (si productId fourni)
 * - Le prix maximum (affecte les filtres)
 * - Les compteurs de produits par statut
 * - L'inventaire dashboard
 * - Les badges de la sidebar (affecte le count d'inventaire)
 */
export function getProductInvalidationTags(productSlug: string, productId?: string): string[] {
	const tags = [
		PRODUCTS_CACHE_TAGS.LIST,
		PRODUCTS_CACHE_TAGS.DETAIL(productSlug),
		PRODUCTS_CACHE_TAGS.MAX_PRICE,
		PRODUCTS_CACHE_TAGS.COUNTS,
		DASHBOARD_CACHE_TAGS.INVENTORY_LIST,
		DASHBOARD_CACHE_TAGS.BADGES,
	]

	if (productId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKUS(productId))
	}

	return tags
}

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
