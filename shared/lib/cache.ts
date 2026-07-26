/**
 * Helper de cache partagé
 *
 * Pour les helpers spécifiques aux modules, voir :
 * - modules/products/utils/cache.utils.ts
 * - modules/collections/utils/cache.utils.ts
 * - modules/users/utils/cache.utils.ts
 */

import { cacheLife, cacheTag } from "next/cache";

/**
 * Configure le cache avec le profil `user` (2min stale, 1min revalidate, 10min expire)
 *
 * Utilisé par les fetchers du dashboard admin (données agrégées).
 *
 * @param tag - Tag de cache optionnel pour l'invalidation ciblée
 *
 * @example
 * ```ts
 * async function fetchData() {
 *   "use cache"
 *   cacheDashboard("my-dashboard-tag")
 *   return prisma.data.findMany()
 * }
 * ```
 */
export function cacheDashboard(tag?: string): void {
	cacheLife("user");
	if (tag) {
		cacheTag(tag);
	}
}
