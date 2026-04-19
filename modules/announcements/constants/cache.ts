import { cacheLife, cacheTag, updateTag } from "next/cache";

// ============================================================================
// CACHE TAGS
// ============================================================================

const ANNOUNCEMENT_CACHE_TAGS = {
	/** Active announcement for storefront */
	ACTIVE: "active-announcement",
	/** Admin list of all announcements */
	LIST: "announcements-list",
} as const;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/** Cache for active announcement (public storefront) - 1h stale / 15m revalidate */
export function cacheActiveAnnouncement() {
	cacheLife("reference");
	cacheTag(ANNOUNCEMENT_CACHE_TAGS.ACTIVE);
}

/** Cache for admin announcements list - 1m stale / 30s revalidate */
export function cacheAnnouncementsList() {
	cacheLife("user");
	cacheTag(ANNOUNCEMENT_CACHE_TAGS.LIST);
}

// ============================================================================
// INVALIDATION
// ============================================================================

/** Get all tags to invalidate when an announcement changes */
export function getAnnouncementInvalidationTags(): string[] {
	return [ANNOUNCEMENT_CACHE_TAGS.ACTIVE, ANNOUNCEMENT_CACHE_TAGS.LIST];
}

/**
 * Invalidate every cache tag related to announcements (storefront active +
 * admin list). Call from any mutation server action after the DB write.
 */
export function invalidateAnnouncementCache(): void {
	for (const tag of getAnnouncementInvalidationTags()) {
		updateTag(tag);
	}
}
