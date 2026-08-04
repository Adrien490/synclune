/**
 * Tags de cache pour le module Products
 *
 * Fonctions: voir utils/cache.utils.ts
 */

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE PROFILES (definis dans next.config.ts)
// ============================================
// - catalog:   stale=15min, revalidate=5min, expire=6h  (produits, SKUs, related)
// - checkout:  stale=1min, revalidate=30s, expire=5min  (stock, panier, confirmation)
// - user:      stale=2min, revalidate=1min, expire=10min (dashboard admin, donnees user)
// - reference: stale=7j, revalidate=24h, expire=30j     (prix max, donnees stables)

// ============================================
// CACHE TAGS
// ============================================

export const PRODUCTS_CACHE_TAGS = {
	/** Liste complète des produits (source of truth: SHARED_CACHE_TAGS.PRODUCTS_LIST) */
	LIST: SHARED_CACHE_TAGS.PRODUCTS_LIST,

	/** Détail d'un produit spécifique */
	DETAIL: (slug: string) => `product-${slug}`,

	/**
	 * Détail d'un produit par ID — lecture de duplication, où le slug de la source
	 * n'est pas connu de l'appelant.
	 *
	 * ⚠️ NE PAS retomber sur `DETAIL(\`product-id-${id}\`)` : c'est ce que faisait
	 * `get-product-for-duplication.ts`, et le tag `product-product-id-<cuid>` ainsi
	 * fabriqué n'était émis par aucun mutateur (tous appellent `DETAIL(slug)`).
	 * L'entrée n'était joignable que par le `products-list` co-posé (audit cache
	 * catalogue 2026-07-31).
	 */
	DETAIL_BY_ID: (productId: string) => `product-id-${productId}`,

	/**
	 * SKUs d'un produit — posé par `modules/skus/data/fetch-skus.ts` quand la liste
	 * est filtrée sur un produit.
	 */
	SKUS: (productId: string) => `product-${productId}-skus`,

	/** Collections d'un produit (invalidé lors d'updateProductCollections / create / update) */
	COLLECTIONS: (productId: string) => `product-${productId}-collections`,

	/** Prix maximum des produits (pour filtres) */
	MAX_PRICE: "max-product-price",

	/** Compteurs de produits par statut (dashboard) */
	COUNTS: "product-counts",

	/** Liste globale des SKUs */
	SKUS_LIST: "skus-list",

	// `SKU_DETAIL: (sku) => \`sku-${sku}\`` a été RETIRÉ (audit cache catalogue
	// 2026-07-31) : invalidé inconditionnellement par `getSkuInvalidationTags`, posé
	// par aucun lecteur. Aucun chemin ne lit un SKU par son code — l'édition admin
	// passe par l'id, ci-dessous.

	/** Détail d'un SKU par ID (pour les lookups d'édition admin) */
	SKU_DETAIL_BY_ID: (skuId: string) => `sku-id-${skuId}`,

	/** Stock temps réel d'un SKU (invalidé après achat/mise à jour stock) */
	SKU_STOCK: (skuId: string) => `sku-stock-${skuId}`,

	/** Produits similaires publics (visiteurs non authentifiés) */
	RELATED_PUBLIC: "related-products-public",

	// `RELATED_USER: (userId) => \`related-products-user-${userId}\`` a été RETIRÉ
	// avec `Order.userId` (audit schéma V1, 2026-08-05) : son unique lecteur était le
	// carrousel personnalisé par historique d'achat, impossible depuis que le
	// parcours est 100 % invité. C'était aussi le seul orphelin d'invalidation
	// toléré du catalogue — l'allowlist de `no-orphan-catalogue-cache-tags` est
	// désormais vide.

	/** Produits similaires contextuels par produit */
	RELATED_CONTEXTUAL: (productSlug: string) => `related-products-contextual-${productSlug}`,
} as const;

/**
 * Cache tags pour les produits recemment vus
 */
export const RECENT_PRODUCTS_CACHE_TAGS = {
	/** Tag principal pour les produits recemment vus */
	LIST: "recent-products-list",
} as const;

/**
 * Retourne les tags a invalider pour les produits recemment vus
 */
export function getRecentProductsInvalidationTags(): string[] {
	return [RECENT_PRODUCTS_CACHE_TAGS.LIST];
}

// `RECENT_SEARCHES_CACHE_TAGS` / `getRecentSearchesInvalidationTags` ont été RETIRÉS
// (audit cache catalogue 2026-07-31) : trois Server Actions invalidaient
// `recent-searches-list` alors qu'aucun lecteur ne le posait — `get-recent-searches.ts`
// est une lecture de cookie délibérément NON cachée. Une invalidation dans le vide.
// Si les recherches récentes devaient un jour être cachées, c'est le lecteur qui
// devrait poser le tag EN MÊME TEMPS que ces mutateurs le réémettent.
