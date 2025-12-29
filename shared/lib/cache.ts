/**
 * Helpers de cache partagés
 *
 * Ce fichier centralise les fonctions de configuration du cache
 * pour éviter les cycles de dépendances entre modules.
 */

import { cacheLife, cacheTag } from "next/cache"

/**
 * Configure le cache avec la durée par défaut (dashboard profile)
 * Utilisé pour les données qui nécessitent un refresh fréquent
 *
 * @param tag - Tag de cache optionnel
 */
export function cacheDefault(tag?: string) {
	cacheLife("dashboard")
	if (tag) {
		cacheTag(tag)
	}
}
