/**
 * Cache utilities
 *
 * Wrappers autour des fonctions natives de Next.js pour une API cohérente.
 * Après migration vers les modules DDD, ce fichier ne contient plus que :
 * - Les helpers génériques de cache (non liés à un domaine)
 * - Les wrappers d'invalidation
 */

import { cacheLife, cacheTag } from "next/cache"
import { revalidateTag as nextRevalidateTag, updateTag as nextUpdateTag } from "next/cache"

// ============================================
// GENERIC CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les données référentielles (couleurs, types)
 * - Utilisé pour : sélecteurs de filtres, formulaires admin
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 */
export function cacheReference() {
	cacheLife("reference")
}

/**
 * Configure le cache pour les changelogs
 * - Utilisé pour : ChangelogDialog, système de notifications
 * - Durée : 1 jour fraîche, 1h revalidation, 7j expiration
 */
export function cacheChangelogs() {
	cacheLife("changelog")
	cacheTag("changelogs")
}

// ============================================
// CACHE INVALIDATION WRAPPERS
// ============================================

/**
 * Wrapper autour de revalidateTag pour une API cohérente
 * Utilise le profil 'max' pour servir le cache pendant la revalidation
 * Idéal pour les cas où la fraîcheur immédiate n'est pas critique
 */
export function revalidateTag(tag: string) {
	nextRevalidateTag(tag, "max")
}

/**
 * Invalide plusieurs tags à la fois avec revalidateTag
 */
export function revalidateTags(tags: string[]) {
	tags.forEach((tag) => revalidateTag(tag))
}

/**
 * Invalide immédiatement un tag (read-your-own-writes)
 * Utilisé dans les Server Actions où l'utilisateur doit voir ses changements instantanément
 * Exemple : création de commande, modification de profil, ajout au panier
 */
export function updateTag(tag: string) {
	nextUpdateTag(tag)
}

/**
 * Invalide immédiatement plusieurs tags (read-your-own-writes)
 */
export function updateTags(tags: string[]) {
	tags.forEach((tag) => updateTag(tag))
}
