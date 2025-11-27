/**
 * Cache module - Point d'entrée principal (simplifié)
 *
 * Après migration vers les modules DDD, ce module ne contient plus que :
 * - Les wrappers pour updateTag/updateTags (invalidation immédiate)
 * - Les wrappers pour revalidateTag/revalidateTags (invalidation avec stale-while-revalidate)
 * - Les helpers de cache génériques (cacheReference, cacheChangelogs)
 *
 * Les tags et helpers spécifiques à chaque domaine sont maintenant dans :
 * @/modules/{domain}/constants/cache.ts
 */

export {
	// Generic cache configuration helpers (no domain-specific tags)
	cacheReference,
	cacheChangelogs,
	// Invalidation wrappers
	revalidateTag,
	revalidateTags,
	updateTag,
	updateTags,
} from "./utils"
