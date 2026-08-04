/**
 * Helpers de cache pour le module Products
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { COLORS_CACHE_TAGS } from "@/modules/colors/constants/cache";
import { MATERIALS_CACHE_TAGS } from "@/modules/materials/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS, RECENT_PRODUCTS_CACHE_TAGS } from "../constants/cache";

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

// `cacheProductSkus` et `cacheSkuDetail` ont été RETIRÉS (audit cache catalogue
// 2026-07-31) : ni l'un ni l'autre n'avait d'appelant en production, alors que les
// tags qu'ils posaient — `SKUS(productId)` et `SKU_DETAIL(sku)` — étaient invalidés
// par une dizaine de mutateurs. Deux familles de tags décoratives, et une régression
// (STOCK-STALE-BASELINE-001) qui assertait la couverture d'un lecteur inexistant.
//
// `SKUS(productId)` est désormais posé par le VRAI lecteur par-produit,
// `modules/skus/data/fetch-skus.ts`. `SKU_DETAIL(sku)` n'a pas été rebranché : aucun
// chemin ne lit un SKU par son code, la lecture admin se fait par id
// (`SKU_DETAIL_BY_ID` via `cacheSkuDetailById`).

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
 * - Le carrousel « Vus récemment » (un produit archivé/supprimé doit en sortir)
 * - La liste des types de bijoux (leur `hasProducts` dépend des produits PUBLIC)
 *
 * Note: RELATED_USER n'est pas invalidé ici car il dépend du contexte user.
 * Il expirera naturellement via son TTL (30min).
 */
export function getProductInvalidationTags(
	productSlug: string,
	productId?: string,
	options?: {
		/** Couleurs portées par les SKUs du produit — leur KPI « produits distincts » bouge. */
		affectedColorIds?: readonly string[];
		/** Idem matériaux (parité M2M `ProductSkuMaterial`). */
		affectedMaterialIds?: readonly string[];
	},
): string[] {
	const tags: string[] = [
		PRODUCTS_CACHE_TAGS.LIST,
		PRODUCTS_CACHE_TAGS.DETAIL(productSlug),
		// `fetchSkuDetailById` (le formulaire d'édition SKU) embarque `product.title`,
		// `product.status` et `product._count.skus` sous `skus-list` : sans ce tag, une
		// édition produit laissait ces champs périmés toute la fenêtre du profil `user`.
		PRODUCTS_CACHE_TAGS.SKUS_LIST,
		PRODUCTS_CACHE_TAGS.MAX_PRICE,
		PRODUCTS_CACHE_TAGS.COUNTS,
		PRODUCTS_CACHE_TAGS.RELATED_PUBLIC,
		PRODUCTS_CACHE_TAGS.RELATED_CONTEXTUAL(productSlug),
		// `get-recent-products.ts` documentait « Invalidé par:
		// updateTag("recent-products-list") lors de mutations produits » — ce qui n'était
		// vrai NULLE PART : seul le cron RGPD bustait ce tag (les avis aussi, jusqu'à
		// leur retrait le 2026-07-30). Un produit archivé restait donc dans « Vus
		// récemment » jusqu'à expiration du profil.
		RECENT_PRODUCTS_CACHE_TAGS.LIST,
		// `hasProducts` / `_count.products` des types de bijoux se calculent sur les
		// produits PUBLIC : publier le premier bijou d'un type doit le faire apparaître
		// au mega-menu et au sitemap sans attendre l'expiration du profil `user`.
		SHARED_CACHE_TAGS.PRODUCT_TYPES_LIST,
		// Les bento des collections (/collections + mega-menu navbar) sont des images
		// de PRODUITS lues via `collection.products.skus.images` sous `collections-list` :
		// changer l'image d'un bijou doit les rafraîchir sans attendre l'expiration du
		// profil `reference` (24 h). Remplace l'ex-tag `NAVBAR_MENU`, déposé quand
		// `getNavbarMenuData` a perdu son scope cache agrégé (CACHE-DEGRADED-VALUE-001).
		SHARED_CACHE_TAGS.COLLECTIONS_LIST,
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		SHARED_CACHE_TAGS.SITEMAP_IMAGES,
	];

	if (productId) {
		tags.push(PRODUCTS_CACHE_TAGS.SKUS(productId));
		tags.push(PRODUCTS_CACHE_TAGS.COLLECTIONS(productId));
		// Lecture de duplication (`get-product-for-duplication.ts`). Elle se cachait
		// sous un tag fabriqué à la main que personne n'invalidait.
		tags.push(PRODUCTS_CACHE_TAGS.DETAIL_BY_ID(productId));
	}

	// `COLORS/MATERIALS.PRODUCT_COUNT(id)` ne cascadaient que depuis les mutateurs
	// SKU (`getSkuInvalidationTags`). Or le compteur — nombre de produits DISTINCTS
	// portant la couleur — bouge aussi quand c'est le PRODUIT qui change :
	// suppression (cascade de ses SKUs), duplication, changement de statut (le
	// compteur ne retient que les SKUs actifs). Le KPI des listes couleurs et
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
 * SSOT unique — `modules/skus/utils/cache.utils.ts` le ré-exporte.
 *
 * ⚠️ Il existait ici une SECONDE implémentation homonyme, plus pauvre, à laquelle
 * `collectStockInvalidationTags` déléguait (audit cache 2026-07-31). Elle omettait
 * `SKU_DETAIL_BY_ID`, `SKUS_LIST` et `LIST` : toute invalidation passant par ce
 * fichier (`toggle-product-status`, `mark-as-paid`)
 * laissait donc le formulaire d'édition SKU sur un inventaire périmé, alors que le
 * même geste depuis `adjust-sku-stock` — qui importait l'autre version — était
 * correct. Deux helpers de même nom et de couverture différente : le call site
 * décidait de la justesse selon son import.
 *
 * ⚠️ STOCK-STALE-BASELINE-001 — ce set DOIT couvrir tout tag posé par
 * `cacheSkuDetailById` / `cacheProductSkus`. Il manquait `SKU_DETAIL_BY_ID` et
 * `SKUS_LIST`, les deux tags de `fetchSkuById` / `fetchSkuDetailById` : après un
 * ajustement de stock, le formulaire d'édition continuait de rendre l'ancien
 * inventaire pendant la fenêtre du profil `user` (60 s revalidate / 120 s stale).
 * Ce n'est pas cosmétique — ce formulaire poste ce chiffre comme
 * `originalInventory`, la baseline du delta relatif : une baseline périmée fait
 * diverger le stock enregistré du stock saisi (réel 15, formulaire à 10, l'admin
 * saisit 12 ⇒ delta +2 ⇒ 17). La concurrence optimiste dépend de la fraîcheur que
 * ce helper garantit. Verrouillé par
 * `modules/skus/utils/__tests__/inventory-invalidation-covers-reader.regression.test.ts`.
 */
export function getInventoryInvalidationTags(
	productSlug: string,
	productId: string,
	skuIds?: string[],
): string[] {
	const tags = [
		PRODUCTS_CACHE_TAGS.DETAIL(productSlug),
		PRODUCTS_CACHE_TAGS.SKUS(productId),
		PRODUCTS_CACHE_TAGS.LIST,
		PRODUCTS_CACHE_TAGS.SKUS_LIST,
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];

	// Invalider le cache stock temps réel + le détail par ID de chaque SKU
	if (skuIds) {
		for (const skuId of skuIds) {
			tags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
			tags.push(PRODUCTS_CACHE_TAGS.SKU_DETAIL_BY_ID(skuId));
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
