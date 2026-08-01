/**
 * Helpers de cache pour le module SKUs
 *
 * Note: Ce module utilise PRODUCTS_CACHE_TAGS car les SKUs sont liés aux produits.
 */

import { cacheLife, cacheTag } from "next/cache";
import { COLORS_CACHE_TAGS } from "@/modules/colors/constants/cache";
import { MATERIALS_CACHE_TAGS } from "@/modules/materials/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import type { SkuDataForInvalidation } from "../types/sku.types";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

// Le ré-export de `cacheProductSkus` est parti avec le helper lui-même (audit cache
// catalogue 2026-07-31) : il n'avait aucun appelant, et le tag `SKUS(productId)`
// qu'il posait est désormais émis par le vrai lecteur, `../data/fetch-skus.ts`.

/**
 * Configure le cache pour un SKU spécifique (par ID)
 * Utilisé pour les lookups d'édition admin où seul l'ID est disponible.
 * Profil `user` (1min revalidate / 2min stale) — admin attend la fraîcheur.
 */
export function cacheSkuDetailById(skuId: string) {
	cacheLife("user");
	cacheTag(PRODUCTS_CACHE_TAGS.SKU_DETAIL_BY_ID(skuId), PRODUCTS_CACHE_TAGS.SKUS_LIST);
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
 * - Le prix maximum (affecte les filtres de prix)
 * - Le stock temps réel du SKU (si skuId fourni)
 * - Les SKUs du produit parent (si productId fourni)
 * - Le détail du produit parent (si productSlug fourni)
 * - La liste des produits (si productSlug fourni)
 * - L'inventaire dashboard
 * - Les badges de la sidebar (affecte le count d'inventaire critique)
 * - La liste/détail couleurs + KPI distinct products (si `affectedColor*`
 *   fourni) : les stats admin `_count.skuColors` deviennent stale dès qu'un
 *   SKU change ses `colorIds`, le mutateur SKU doit propager.
 * - La liste/détail matériaux + KPI distinct products (parité M2M
 *   `ProductSkuMaterial`, symétrique des couleurs).
 */
export function getSkuInvalidationTags(
	sku: string,
	productId?: string,
	productSlug?: string,
	skuId?: string,
	affectedColorSlugs?: readonly string[],
	affectedColorIds?: readonly string[],
	affectedMaterialSlugs?: readonly string[],
	affectedMaterialIds?: readonly string[],
): string[] {
	// Annotation explicite : sans `SKU_DETAIL(sku)`, tous les éléments littéraux
	// restants sont des constantes, et TS inférait `("skus-list" | …)[]` — les
	// `push` conditionnels ci-dessous ne compilaient plus.
	const tags: string[] = [
		PRODUCTS_CACHE_TAGS.SKUS_LIST,
		// `SKU_DETAIL(sku)` retiré : aucun lecteur ne l'a jamais posé (audit cache
		// catalogue 2026-07-31). Le paramètre `sku` reste utile aux appelants pour la
		// journalisation et la déduplication de `collectBulkInvalidationTags`.
		PRODUCTS_CACHE_TAGS.MAX_PRICE,
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		// Le sitemap images lit `skus.images` triés isPrimary desc — exactement ce
		// que mutent set-primary-sku-media, reorder-sku-media, update/delete/create-sku.
		// Sans ce tag il restait périmé toute la fenêtre du profil `reference`
		// (24 h revalidate / 7 j stale). Parité avec getProductInvalidationTags.
		SHARED_CACHE_TAGS.SITEMAP_IMAGES,
	];

	// Invalider le cache stock temps réel et le détail par ID si skuId fourni
	if (skuId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
		tags.push(PRODUCTS_CACHE_TAGS.SKU_DETAIL_BY_ID(skuId));
	}

	if (productId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKUS(productId));
	}

	if (productSlug) {
		tags.push(PRODUCTS_CACHE_TAGS.DETAIL(productSlug), PRODUCTS_CACHE_TAGS.LIST);
	}

	if (affectedColorSlugs?.length) {
		tags.push(COLORS_CACHE_TAGS.LIST);
		for (const slug of affectedColorSlugs) {
			tags.push(COLORS_CACHE_TAGS.DETAIL(slug));
		}
	}

	if (affectedColorIds?.length) {
		for (const id of affectedColorIds) {
			tags.push(COLORS_CACHE_TAGS.PRODUCT_COUNT(id));
		}
	}

	if (affectedMaterialSlugs?.length) {
		tags.push(MATERIALS_CACHE_TAGS.LIST);
		for (const slug of affectedMaterialSlugs) {
			tags.push(MATERIALS_CACHE_TAGS.DETAIL(slug));
		}
	}

	if (affectedMaterialIds?.length) {
		for (const id of affectedMaterialIds) {
			tags.push(MATERIALS_CACHE_TAGS.PRODUCT_COUNT(id));
		}
	}

	return tags;
}

/**
 * Tags à invalider lors de la modification des stocks.
 *
 * Ré-export de la SSOT `modules/products/utils/cache.utils.ts` — les tags posés
 * sont ceux du module products, c'est donc lui qui porte l'implémentation.
 *
 * ⚠️ Ce fichier en hébergeait un DOUBLON homonyme, plus complet que celui de
 * products, qui lui gardait une version pauvre à laquelle
 * `collectStockInvalidationTags` déléguait (audit cache 2026-07-31). La
 * couverture d'une invalidation dépendait donc de l'import choisi par le call
 * site. Ne pas réintroduire une seconde implémentation : étendre la SSOT.
 *
 * ⚠️ STOCK-STALE-BASELINE-001 — le set DOIT couvrir tout tag posé par
 * `cacheSkuDetailById` / `cacheProductSkus` ci-dessus (justification détaillée
 * dans la SSOT). Verrouillé par
 * `__tests__/inventory-invalidation-covers-reader.regression.test.ts`.
 */
export { getInventoryInvalidationTags } from "@/modules/products/utils/cache.utils";

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
			skuData.id,
		);
		tags.forEach((tag) => uniqueTags.add(tag));
	}

	return uniqueTags;
}

// `invalidateTags(Set)` a été retiré (audit cache 2026-07-31) : zéro appelant en
// production, et son nom neutre masquait le choix d'API le plus piégeux du repo
// (`updateTag` en Server Action vs `revalidateTag` ailleurs). Utiliser directement
// `updateTagsAfterMutation` / `revalidateTagsInBackground` (`@/shared/lib/cache`),
// dont le nom porte le contexte d'exécution.
