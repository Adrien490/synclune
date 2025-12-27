/**
 * Helpers de cache pour le module Products
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les listes de produits
 * - Utilisé pour : /products, recherches, filtres
 * - Durée : 1h fraîche, 15min revalidation, 1j expiration
 */
export function cacheProducts() {
	cacheLife("products");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour le détail d'un produit
 * - Utilisé pour : /products/[slug]
 * - Durée : 30min fraîche, 10min revalidation, 12h expiration
 */
export function cacheProductDetail(slug: string) {
	cacheLife("productDetail");
	cacheTag(PRODUCTS_CACHE_TAGS.DETAIL(slug), PRODUCTS_CACHE_TAGS.LIST);
}

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
 * Tags à invalider lors de la modification d'un produit
 *
 * Invalide automatiquement :
 * - La liste des produits
 * - Le détail du produit
 * - Les SKUs du produit (si productId fourni)
 * - Le prix maximum (affecte les filtres)
 * - Les compteurs de produits par statut
 * - Les produits similaires publics
 * - Les produits similaires contextuels (par produit)
 * - L'inventaire dashboard
 * - Les badges de la sidebar (affecte le count d'inventaire)
 *
 * Note: RELATED_USER n'est pas invalidé ici car il dépend du contexte user.
 * Il expirera naturellement via son TTL (30min).
 */
export function getProductInvalidationTags(productSlug: string, productId?: string): string[] {
	const tags = [
		PRODUCTS_CACHE_TAGS.LIST,
		PRODUCTS_CACHE_TAGS.DETAIL(productSlug),
		PRODUCTS_CACHE_TAGS.MAX_PRICE,
		PRODUCTS_CACHE_TAGS.COUNTS,
		PRODUCTS_CACHE_TAGS.RELATED_PUBLIC,
		PRODUCTS_CACHE_TAGS.RELATED_CONTEXTUAL(productSlug),
		PRODUCTS_CACHE_TAGS.BESTSELLERS,
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];

	if (productId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKUS(productId));
	}

	return tags;
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
 * - Le prix maximum (affecte les filtres de prix)
 * - L'inventaire dashboard
 * - Les badges de la sidebar (affecte le count d'inventaire critique)
 */
export function getSkuInvalidationTags(sku: string, productId?: string, productSlug?: string, skuId?: string): string[] {
	const tags = [
		PRODUCTS_CACHE_TAGS.SKUS_LIST,
		PRODUCTS_CACHE_TAGS.SKU_DETAIL(sku),
		PRODUCTS_CACHE_TAGS.MAX_PRICE,
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
 * Tags à invalider pour le stock temps réel d'un SKU
 *
 * Utilisé après un achat ou une mise à jour de stock.
 */
export function getSkuStockInvalidationTags(skuId: string): string[] {
	return [PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId)];
}
