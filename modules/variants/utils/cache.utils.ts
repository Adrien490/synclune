/**
 * Helpers de cache pour le module variants — schéma lean (lot 2).
 * Utilise PRODUCTS_CACHE_TAGS (les variantes sont liées aux produits).
 */

import { cacheLife, cacheTag } from "next/cache";
import { COLORS_CACHE_TAGS } from "@/modules/colors/constants/cache";
import { MATERIALS_CACHE_TAGS } from "@/modules/materials/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour une variante spécifique (par ID).
 * Profil `user` (1min revalidate / 2min stale) — admin attend la fraîcheur.
 */
export function cacheVariantDetailById(variantId: string) {
	cacheLife("user");
	cacheTag(PRODUCTS_CACHE_TAGS.VARIANT_DETAIL_BY_ID(variantId), PRODUCTS_CACHE_TAGS.VARIANTS_LIST);
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la mutation d'une variante.
 *
 * Couvre : liste des variantes, détail par id, prix max (filtres), variantes du
 * produit parent, détail + liste produits, stock temps réel, badges admin, et
 * les listes/compteurs couleur & matériau touchés.
 */
export function getVariantInvalidationTags(params: {
	variantId?: string;
	productId?: string;
	productSlug?: string;
	colorIds?: readonly (string | null | undefined)[];
	materialIds?: readonly (string | null | undefined)[];
}): string[] {
	const tags: string[] = [
		PRODUCTS_CACHE_TAGS.VARIANTS_LIST,
		PRODUCTS_CACHE_TAGS.MAX_PRICE,
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		SHARED_CACHE_TAGS.SITEMAP_IMAGES,
	];

	if (params.variantId) {
		tags.push(PRODUCTS_CACHE_TAGS.VARIANT_DETAIL_BY_ID(params.variantId));
		tags.push(PRODUCTS_CACHE_TAGS.VARIANT_STOCK(params.variantId));
	}
	if (params.productId) {
		tags.push(PRODUCTS_CACHE_TAGS.VARIANTS(params.productId));
	}
	if (params.productSlug) {
		tags.push(PRODUCTS_CACHE_TAGS.DETAIL(params.productSlug));
		tags.push(PRODUCTS_CACHE_TAGS.LIST);
	}
	for (const colorId of params.colorIds ?? []) {
		if (!colorId) continue;
		tags.push(COLORS_CACHE_TAGS.LIST, COLORS_CACHE_TAGS.DETAIL(colorId));
		tags.push(COLORS_CACHE_TAGS.PRODUCT_COUNT(colorId));
	}
	for (const materialId of params.materialIds ?? []) {
		if (!materialId) continue;
		tags.push(MATERIALS_CACHE_TAGS.LIST, MATERIALS_CACHE_TAGS.DETAIL(materialId));
		tags.push(MATERIALS_CACHE_TAGS.PRODUCT_COUNT(materialId));
	}

	return Array.from(new Set(tags));
}
