/**
 * Helpers de cache pour le module Product Types
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Tag de détail granulaire par slug. Utilisé sur les fetchers `findUnique(slug)`
 * pour permettre une invalidation ciblée (vs liste globale).
 */
export const productTypeDetailTag = (slug: string) => `product-type-${slug}` as const;

/**
 * Tag de counts par type — invalidé après mutation produit (status change).
 */
export const productTypeCountsTag = (productTypeId: string) =>
	`product-type-${productTypeId}-counts` as const;

/**
 * Public : `reference` (stable, navbar/options/sitemap).
 * @deprecated Préférer `cacheProductTypesPublic`/`cacheProductTypesAdmin` selon contexte.
 *             Conservé pour rétrocompatibilité tests.
 */
export function cacheProductTypes() {
	cacheLife("reference");
	cacheTag(PRODUCT_TYPES_CACHE_TAGS.LIST);
}

/**
 * Lectures publiques (navbar, sitemap, getProductTypeOptions) — données stables.
 */
export function cacheProductTypesPublic() {
	cacheLife("reference");
	cacheTag(PRODUCT_TYPES_CACHE_TAGS.LIST);
}

/**
 * Lectures admin (listing data-table, mobile-list) — admin attend feedback rapide
 * après mutation, on s'aligne sur le profil `user` (stale 2m / revalidate 1m).
 */
export function cacheProductTypesAdmin() {
	cacheLife("user");
	cacheTag(PRODUCT_TYPES_CACHE_TAGS.LIST);
}

/**
 * Détail admin par slug. Tag granulaire + tag liste pour cohabitation.
 */
export function cacheProductTypeDetail(slug: string) {
	cacheLife("user");
	cacheTag(PRODUCT_TYPES_CACHE_TAGS.LIST);
	cacheTag(productTypeDetailTag(slug));
}

/**
 * Counts par statut produit pour un type donné.
 *
 * Pose aussi le tag `products-list` : les counts dépendent des produits
 * (create/delete/changement de statut), et ces mutations invalident toutes
 * `PRODUCTS_CACHE_TAGS.LIST` — cascade qui garantit la fraîcheur des counts
 * sans exiger que chaque mutation produit connaisse le type concerné.
 */
export function cacheProductTypeCounts(productTypeId: string) {
	cacheLife("user");
	cacheTag(productTypeCountsTag(productTypeId));
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'un type de produit.
 *
 * Invalide automatiquement :
 * - La liste des types de produits.
 * - Les badges de la sidebar admin.
 * - Le menu de navigation (navbar).
 * - La liste des produits (cascade : un type renommé impacte les cards produits).
 * - Si `slug` fourni : le tag détail granulaire `product-type-${slug}`.
 * - Si `productTypeId` fourni : le tag counts par statut `product-type-${id}-counts`.
 */
export function getProductTypeInvalidationTags(slug?: string, productTypeId?: string): string[] {
	const tags: string[] = [
		PRODUCT_TYPES_CACHE_TAGS.LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		SHARED_CACHE_TAGS.NAVBAR_MENU,
		PRODUCTS_CACHE_TAGS.LIST,
	];
	if (slug) tags.push(productTypeDetailTag(slug));
	if (productTypeId) tags.push(productTypeCountsTag(productTypeId));
	return tags;
}
