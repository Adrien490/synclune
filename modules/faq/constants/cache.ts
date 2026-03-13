import { cacheLife } from "next/cache";
import { cacheTag } from "next/cache";

// ============================================================================
// FAQ CACHE TAGS
// ============================================================================

export const FAQ_CACHE_TAGS = {
	/** Public FAQ items for storefront */
	PUBLIC: "faq-items",
	/** Admin list of all FAQ items */
	LIST: "faq-items-list",
} as const;

/** Cache for public FAQ items - 7d stale / 24h revalidate */
export function cacheFaqPublic() {
	cacheLife("reference");
	cacheTag(FAQ_CACHE_TAGS.PUBLIC);
}

/** Cache for admin FAQ items list - 1m stale / 30s revalidate */
export function cacheFaqList() {
	cacheLife("dashboard");
	cacheTag(FAQ_CACHE_TAGS.LIST);
}

/** Get all tags to invalidate when a FAQ item changes */
export function getFaqInvalidationTags(): string[] {
	return [FAQ_CACHE_TAGS.PUBLIC, FAQ_CACHE_TAGS.LIST];
}
