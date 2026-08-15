/**
 * Helpers de cache pour le module Products
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { COLORS_CACHE_TAGS } from "@/modules/colors/constants/cache";
import { MATERIALS_CACHE_TAGS } from "@/modules/materials/constants/cache";
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
 * Configure le cache pour le détail d'un produit lu par ID (duplication admin).
 *
 * Existe parce que `get-product-for-duplication.ts` appelait
 * `cacheProductDetail(\`product-id-${id}\`)` — un id nourri à une fabrique de slug,
 * qui produisait `product-product-id-<cuid>`, tag qu'aucun mutateur n'émettait.
 * L'entrée ne se rafraîchissait que par le `products-list` co-posé ici.
 */
export function cacheProductDetailById(productId: string) {
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.DETAIL_BY_ID(productId), PRODUCTS_CACHE_TAGS.LIST);
}

// `cacheProductVariants` et `cacheVariantDetail` ont été RETIRÉS (audit cache catalogue
// 2026-07-31) : ni l'un ni l'autre n'avait d'appelant en production, alors que les
// tags qu'ils posaient — `VARIANTS(productId)` et `VARIANT_DETAIL(variant)` — étaient invalidés
// par une dizaine de mutateurs. Deux familles de tags décoratives, et une régression
// (STOCK-STALE-BASELINE-001) qui assertait la couverture d'un lecteur inexistant.
//
// `VARIANTS(productId)` est désormais posé par le VRAI lecteur par-produit,
// `modules/variants/data/fetch-variants.ts`. `VARIANT_DETAIL(variant)` n'a pas été rebranché : aucun
// chemin ne lit un VARIANT par son code, la lecture admin se fait par id
// (`VARIANT_DETAIL_BY_ID` via `cacheVariantDetailById`).

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification d'un produit
 *
 * Invalide automatiquement :
 * - La liste des produits
 * - Le détail du produit
 * - Les VARIANTs du produit (si productId fourni)
 * - Le prix maximum (affecte les filtres)
 * - Les compteurs de produits par statut
 * - Les produits similaires publics
 * - Les produits similaires contextuels (par produit)
 * - L'inventaire dashboard
 * - Les badges de la sidebar (affecte le count d'inventaire)
 * - La liste des types de bijoux (leur `hasProducts` dépend des produits PUBLIC)
 */
export function getProductInvalidationTags(
	productSlug: string,
	productId?: string,
	options?: {
		/** Couleurs portées par les VARIANTs du produit — leur KPI « produits distincts » bouge. */
		affectedColorIds?: readonly string[];
		/** Idem matériaux (parité M2M `ProductVariantMaterial`). */
		affectedMaterialIds?: readonly string[];
	},
): string[] {
	const tags: string[] = [
		PRODUCTS_CACHE_TAGS.LIST,
		PRODUCTS_CACHE_TAGS.DETAIL(productSlug),
		// `fetchVariantDetailById` (le formulaire d'édition VARIANT) embarque `product.name`,
		// `product.status` et `product._count.variants` sous `variants-list` : sans ce tag, une
		// édition produit laissait ces champs périmés toute la fenêtre du profil `user`.
		PRODUCTS_CACHE_TAGS.VARIANTS_LIST,
		PRODUCTS_CACHE_TAGS.MAX_PRICE,
		PRODUCTS_CACHE_TAGS.COUNTS,
		PRODUCTS_CACHE_TAGS.RELATED_PUBLIC,
		PRODUCTS_CACHE_TAGS.RELATED_CONTEXTUAL(productSlug),
		// `hasProducts` / `_count.products` des types de bijoux se calculent sur les
		// produits PUBLIC : publier le premier bijou d'un type doit le faire apparaître
		// au mega-menu et au sitemap sans attendre l'expiration du profil `user`.
		SHARED_CACHE_TAGS.PRODUCT_TYPES_LIST,
		// Les bento des collections (/collections + mega-menu navbar) sont des images
		// de PRODUITS lues via `collection.products.variants.images` sous `collections-list` :
		// changer l'image d'un bijou doit les rafraîchir sans attendre l'expiration du
		// profil `reference` (24 h). Remplace l'ex-tag `NAVBAR_MENU`, déposé quand
		// `getNavbarMenuData` a perdu son scope cache agrégé (CACHE-DEGRADED-VALUE-001).
		SHARED_CACHE_TAGS.COLLECTIONS_LIST,
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		SHARED_CACHE_TAGS.SITEMAP_IMAGES,
	];

	if (productId) {
		tags.push(PRODUCTS_CACHE_TAGS.VARIANTS(productId));
		tags.push(PRODUCTS_CACHE_TAGS.COLLECTIONS(productId));
		// Lecture de duplication (`get-product-for-duplication.ts`). Elle se cachait
		// sous un tag fabriqué à la main que personne n'invalidait.
		tags.push(PRODUCTS_CACHE_TAGS.DETAIL_BY_ID(productId));
	}

	// `COLORS/MATERIALS.PRODUCT_COUNT(id)` ne cascadaient que depuis les mutateurs
	// VARIANT (`getVariantInvalidationTags`). Or le compteur — nombre de produits DISTINCTS
	// portant la couleur — bouge aussi quand c'est le PRODUIT qui change :
	// suppression (cascade de ses VARIANTs), duplication, changement de statut (le
	// compteur ne retient que les VARIANTs actifs). Le KPI des listes couleurs et
	// matériaux restait donc faux jusqu'à expiration du profil `user`.
	for (const colorId of options?.affectedColorIds ?? []) {
		tags.push(COLORS_CACHE_TAGS.PRODUCT_COUNT(colorId));
	}
	for (const materialId of options?.affectedMaterialIds ?? []) {
		tags.push(MATERIALS_CACHE_TAGS.PRODUCT_COUNT(materialId));
	}

	return tags;
}

/**
 * Tags à invalider lors de la modification des stocks.
 *
 * SSOT unique — `modules/variants/utils/cache.utils.ts` le ré-exporte.
 *
 * ⚠️ Il existait ici une SECONDE implémentation homonyme, plus pauvre, à laquelle
 * `collectStockInvalidationTags` déléguait (audit cache 2026-07-31). Elle omettait
 * `VARIANT_DETAIL_BY_ID`, `VARIANTS_LIST` et `LIST` : toute invalidation passant par ce
 * fichier (`toggle-product-status`, `mark-as-paid`)
 * laissait donc le formulaire d'édition VARIANT sur un inventaire périmé, alors que le
 * même geste depuis `adjust-variant-stock` — qui importait l'autre version — était
 * correct. Deux helpers de même nom et de couverture différente : le call site
 * décidait de la justesse selon son import.
 *
 * ⚠️ STOCK-STALE-BASELINE-001 — ce set DOIT couvrir tout tag posé par
 * `cacheVariantDetailById` / `cacheProductVariants`. Il manquait `VARIANT_DETAIL_BY_ID` et
 * `VARIANTS_LIST`, les deux tags de `fetchVariantById` / `fetchVariantDetailById` : après un
 * ajustement de stock, le formulaire d'édition continuait de rendre l'ancien
 * inventaire pendant la fenêtre du profil `user` (60 s revalidate / 120 s stale).
 * Ce n'est pas cosmétique — ce formulaire poste ce chiffre comme
 * `originalStock`, la baseline du delta relatif : une baseline périmée fait
 * diverger le stock enregistré du stock saisi (réel 15, formulaire à 10, l'admin
 * saisit 12 ⇒ delta +2 ⇒ 17). La concurrence optimiste dépend de la fraîcheur que
 * ce helper garantit. Verrouillé par
 * `modules/variants/utils/__tests__/stock-invalidation-covers-reader.regression.test.ts`.
 */
export function getStockInvalidationTags(
	productSlug: string,
	productId: string,
	variantIds?: string[],
): string[] {
	const tags = [
		PRODUCTS_CACHE_TAGS.DETAIL(productSlug),
		PRODUCTS_CACHE_TAGS.VARIANTS(productId),
		PRODUCTS_CACHE_TAGS.LIST,
		PRODUCTS_CACHE_TAGS.VARIANTS_LIST,
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];

	// Invalider le cache stock temps réel + le détail par ID de chaque VARIANT
	if (variantIds) {
		for (const variantId of variantIds) {
			tags.push(PRODUCTS_CACHE_TAGS.VARIANT_STOCK(variantId));
			tags.push(PRODUCTS_CACHE_TAGS.VARIANT_DETAIL_BY_ID(variantId));
		}
	}

	return tags;
}

/**
 * Tags à invalider pour le stock temps réel d'un VARIANT
 *
 * Utilisé après un achat ou une mise à jour de stock.
 */
export function getVariantStockInvalidationTags(variantId: string): string[] {
	return [PRODUCTS_CACHE_TAGS.VARIANT_STOCK(variantId)];
}

/** VARIANT dont le stock a changé, avec son produit pour invalider la page vitrine. */
export interface StockChangedVariant {
	variantId: string;
	productId?: string | null;
	productSlug?: string | null;
}

/**
 * Tags à invalider quand le stock de plusieurs VARIANTs change (achat, restock).
 *
 * CACHE-CATALOG-002 : la page produit embarque `variants.stock` sous le tag
 * `product-${slug}` — invalider seulement VARIANT_STOCK laisse la vitrine et
 * l'inventaire admin périmés jusqu'à expiration du profil `catalog`.
 * Groupe par produit et délègue à getStockInvalidationTags ; retombe sur
 * VARIANT_STOCK seul si le produit n'est pas résolu (VARIANT orphelin).
 */
export function collectStockInvalidationTags(variants: StockChangedVariant[]): string[] {
	const tags = new Set<string>();
	const variantIdsByProduct = new Map<string, { slug: string; variantIds: string[] }>();

	for (const { variantId, productId, productSlug } of variants) {
		if (productId && productSlug) {
			const entry = variantIdsByProduct.get(productId) ?? { slug: productSlug, variantIds: [] };
			entry.variantIds.push(variantId);
			variantIdsByProduct.set(productId, entry);
		} else {
			// ⚠️ Repli DÉGRADÉ, pas équivalent : `VARIANT_STOCK(variantId)` n'est posé que par
			// les fetchers de validation panier/checkout. La PDP ne le pose PAS (elle
			// est sous `product-${slug}`), donc dans cette branche la vitrine garde son
			// stock périmé toute la fenêtre `catalog` — 15 min stale, 6 h expire.
			// Inatteignable sur le chemin nominal (le select du webhook rend toujours
			// `product.id` + `product.slug`) ; c'est un filet pour un VARIANT dont le produit
			// n'a pas été résolu, pas un chemin équivalent. Audit cache 2026-08-07.
			tags.add(PRODUCTS_CACHE_TAGS.VARIANT_STOCK(variantId));
		}
	}

	for (const [productId, { slug, variantIds }] of variantIdsByProduct) {
		for (const tag of getStockInvalidationTags(slug, productId, variantIds)) {
			tags.add(tag);
		}
	}

	return Array.from(tags);
}
