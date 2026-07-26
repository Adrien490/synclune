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
 * - Durée : 15min fraîche, 5min revalidation, 6h expiration
 */
export function cacheProducts() {
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour le détail d'un produit
 * - Utilisé pour : /products/[slug]
 * - Durée : 15min fraîche, 5min revalidation, 6h expiration
 */
export function cacheProductDetail(slug: string) {
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.DETAIL(slug), PRODUCTS_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour les SKUs d'un produit
 */
export function cacheProductSkus(productId: string) {
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.SKUS(productId), PRODUCTS_CACHE_TAGS.SKUS_LIST);
}

/**
 * Configure le cache pour un SKU spécifique
 */
export function cacheSkuDetail(sku: string) {
	cacheLife("catalog");
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
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		SHARED_CACHE_TAGS.SITEMAP_IMAGES,
	];

	if (productId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKUS(productId));
		tags.push(PRODUCTS_CACHE_TAGS.COLLECTIONS(productId));
	}

	return tags;
}

/**
 * Tags à invalider lors de la modification des stocks
 *
 * Invalide uniquement les données affectées, pas toutes les listes.
 * Utile pour les mises à jour fréquentes de stock.
 */
export function getInventoryInvalidationTags(
	productSlug: string,
	productId: string,
	skuIds?: string[],
): string[] {
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

/** SKU dont le stock a changé, avec son produit pour invalider la page vitrine. */
export interface StockChangedSku {
	skuId: string;
	productId?: string | null;
	productSlug?: string | null;
}

/**
 * Tags à invalider quand le stock de plusieurs SKUs change (achat, restock).
 *
 * CACHE-CATALOG-002 : la page produit embarque `skus.inventory` sous le tag
 * `product-${slug}` — invalider seulement SKU_STOCK laisse la vitrine et
 * l'inventaire admin périmés jusqu'à expiration du profil `catalog`.
 * Groupe par produit et délègue à getInventoryInvalidationTags ; retombe sur
 * SKU_STOCK seul si le produit n'est pas résolu (SKU orphelin).
 */
export function collectStockInvalidationTags(skus: StockChangedSku[]): string[] {
	const tags = new Set<string>();
	const skuIdsByProduct = new Map<string, { slug: string; skuIds: string[] }>();

	for (const { skuId, productId, productSlug } of skus) {
		if (productId && productSlug) {
			const entry = skuIdsByProduct.get(productId) ?? { slug: productSlug, skuIds: [] };
			entry.skuIds.push(skuId);
			skuIdsByProduct.set(productId, entry);
		} else {
			tags.add(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
		}
	}

	for (const [productId, { slug, skuIds }] of skuIdsByProduct) {
		for (const tag of getInventoryInvalidationTags(slug, productId, skuIds)) {
			tags.add(tag);
		}
	}

	return Array.from(tags);
}
