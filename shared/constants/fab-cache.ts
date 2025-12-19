/**
 * Tags de cache pour le module FAB
 *
 * Note: Le cache FAB utilise "use cache: private" car la visibilité
 * dépend des cookies de l'utilisateur (préférence par visiteur).
 */

import type { FabKey } from "@/shared/constants/fab";

// ============================================
// CACHE TAGS
// ============================================

export const FAB_CACHE_TAGS = {
	/** Visibilité d'un FAB spécifique pour un visiteur */
	VISIBILITY: (key: FabKey) => `fab-visibility-${key}`,

	/** Toutes les préférences FAB */
	ALL: "fab-all",
} as const;

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification de la visibilité d'un FAB
 */
export function getFabInvalidationTags(key: FabKey): string[] {
	return [FAB_CACHE_TAGS.VISIBILITY(key), FAB_CACHE_TAGS.ALL];
}
