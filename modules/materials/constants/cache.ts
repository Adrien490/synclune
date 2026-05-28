/**
 * Cache configuration for Materials module
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE TAGS
// ============================================

export const MATERIALS_CACHE_TAGS = {
	/** Liste des matériaux */
	LIST: "materials-list",

	/** Détail d'un matériau spécifique */
	DETAIL: (slug: string) => `material-${slug}`,

	/** Nombre de produits distincts référençant ce matériau (clé par id). */
	PRODUCT_COUNT: (materialId: string) => `material-${materialId}-product-count`,
} as const;

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la liste des matériaux
 * - Utilisé pour : sélecteurs de filtres, formulaires admin
 * - Durée : 7j stale, 24h revalidation
 */
export function cacheMaterials() {
	cacheLife("reference");
	cacheTag(MATERIALS_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour un matériau spécifique
 * - Utilisé pour : page détail matériau
 * - Durée : 7j stale, 24h revalidation
 */
export function cacheMaterialDetail(slug: string) {
	cacheLife("reference");
	cacheTag(MATERIALS_CACHE_TAGS.DETAIL(slug), MATERIALS_CACHE_TAGS.LIST);
}

// ============================================
// INVALIDATION HELPER
// ============================================

interface MaterialInvalidationOptions {
	/** Slug du matériau modifié (actuel et/ou précédent si renommé). */
	slug?: string;
	/**
	 * Slugs des produits qui possèdent un SKU référençant ce matériau. Quand
	 * fourni, cascade aussi `products-list` + `product-${slug}` pour que le PDP
	 * storefront ne reste pas avec un ancien nom/description ≤24h (profil
	 * `reference`). Parité comportement `getColorInvalidationTags`.
	 */
	affectedProductSlugs?: readonly string[];
}

/**
 * Tags à invalider lors de la modification d'un matériau.
 *
 * Invalide automatiquement :
 * - La liste des matériaux (`materials-list`)
 * - Le détail du matériau (si `slug` fourni)
 * - Les badges de la sidebar admin
 * - Les pages produit affectées + la liste produits (si `affectedProductSlugs`
 *   fourni) — le PDP embarque le nom du matériau dans le swatch/badge SKU,
 *   un rename resterait sinon stale jusqu'à 24h (profil `reference`).
 *
 * @param input - soit un slug (signature legacy), soit un options bag.
 */
export function getMaterialInvalidationTags(
	input?: string | MaterialInvalidationOptions,
): string[] {
	const opts: MaterialInvalidationOptions =
		typeof input === "string" ? { slug: input } : (input ?? {});

	const tags = new Set<string>([MATERIALS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES]);

	if (opts.slug) {
		tags.add(MATERIALS_CACHE_TAGS.DETAIL(opts.slug));
	}

	if (opts.affectedProductSlugs && opts.affectedProductSlugs.length > 0) {
		tags.add(SHARED_CACHE_TAGS.PRODUCTS_LIST);
		for (const productSlug of opts.affectedProductSlugs) {
			tags.add(`product-${productSlug}`);
		}
	}

	return Array.from(tags);
}
