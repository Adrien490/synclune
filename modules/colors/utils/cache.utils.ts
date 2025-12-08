/**
 * Helpers de cache pour le module Colors
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
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
 */
export function getColorInvalidationTags(): string[] {
	return [COLORS_CACHE_TAGS.LIST];
}
