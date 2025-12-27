/**
 * Helpers de cache pour le module Colors
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { COLORS_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les couleurs
 * - Utilisé pour : sélecteurs de filtres, formulaires admin
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 */
export function cacheColors() {
	cacheLife("reference");
	cacheTag(COLORS_CACHE_TAGS.LIST);
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'une couleur
 *
 * Invalide automatiquement :
 * - La liste des couleurs
 * - Le détail de la couleur (si slug fourni)
 * - Les badges de la sidebar admin
 *
 * @param slug - Slug de la couleur modifiee (optionnel)
 */
export function getColorInvalidationTags(slug?: string): string[] {
	const tags: string[] = [COLORS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES];
	if (slug) {
		tags.push(COLORS_CACHE_TAGS.DETAIL(slug));
	}
	return tags;
}
