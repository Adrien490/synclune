import { cacheLife } from "next/cache";
import { cacheTag } from "next/cache";

// ============================================================================
// CACHE TAGS
// ============================================================================

export const ANNOUNCEMENT_CACHE_TAGS = {
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
	cacheLife("collections");
	cacheTag(ANNOUNCEMENT_CACHE_TAGS.ACTIVE);
}

/** Cache for admin announcements list - 1m stale / 30s revalidate */
export function cacheAnnouncementsList() {
	cacheLife("dashboard");
	cacheTag(ANNOUNCEMENT_CACHE_TAGS.LIST);
}

// ============================================================================
// INVALIDATION
// ============================================================================

/** Get all tags to invalidate when an announcement changes */
export function getAnnouncementInvalidationTags(): string[] {
	return [ANNOUNCEMENT_CACHE_TAGS.ACTIVE, ANNOUNCEMENT_CACHE_TAGS.LIST];
}
