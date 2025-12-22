import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================================================
// CACHE TAGS - Demandes de personnalisation
// ============================================================================

export const CUSTOMIZATION_CACHE_TAGS = {
	/** Liste des demandes (admin) */
	LIST: "customization-requests-list",
	/** Statistiques (admin) */
	STATS: "customization-requests-stats",
	/** Détail d'une demande */
	DETAIL: (id: string) => `customization-request-${id}`,
	/** Recherche de produits pour le formulaire */
	PRODUCT_SEARCH: "customization-product-search",
} as const;

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Applique le cache pour la liste des demandes (admin)
 */
export function cacheCustomizationList() {
	cacheLife("dashboard");
	cacheTag(CUSTOMIZATION_CACHE_TAGS.LIST);
}

/**
 * Applique le cache pour les stats des demandes (admin)
 */
export function cacheCustomizationStats() {
	cacheLife("dashboard");
	cacheTag(CUSTOMIZATION_CACHE_TAGS.STATS);
}

/**
 * Applique le cache pour le détail d'une demande
 */
export function cacheCustomizationDetail(id: string) {
	cacheLife("dashboard");
	cacheTag(CUSTOMIZATION_CACHE_TAGS.DETAIL(id));
}

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

/**
 * Retourne les tags à invalider lors d'une modification
 * Inclut le tag admin-badges pour mettre à jour les compteurs admin
 */
export function getCustomizationInvalidationTags(id?: string): string[] {
	const tags: string[] = [
		CUSTOMIZATION_CACHE_TAGS.LIST,
		CUSTOMIZATION_CACHE_TAGS.STATS,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];
	if (id) {
		tags.push(CUSTOMIZATION_CACHE_TAGS.DETAIL(id));
	}
	return tags;
}
