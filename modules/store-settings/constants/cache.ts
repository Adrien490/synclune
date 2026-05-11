import { cacheLife } from "next/cache";
import { cacheTag } from "next/cache";

// ============================================================================
// SINGLETON
// ============================================================================

export const STORE_SETTINGS_SINGLETON_ID = "store-settings-singleton";

// ============================================================================
// CACHE TAGS
// ============================================================================

const STORE_SETTINGS_CACHE_TAGS = {
	/** Store open/closed status for storefront */
	STATUS: "store-status",
	/** Admin settings view */
	SETTINGS: "store-settings",
	/** Public announcement bar */
	ANNOUNCEMENT: "store-announcement",
} as const;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/** Cache for store status (storefront) - 7d stale / 24h revalidate */
export function cacheStoreStatus() {
	cacheLife("reference");
	cacheTag(STORE_SETTINGS_CACHE_TAGS.STATUS);
}

/** Cache for admin settings - reference profile (config quasi-statique, mutations admin invalident le tag) */
export function cacheStoreSettings() {
	cacheLife("reference");
	cacheTag(STORE_SETTINGS_CACHE_TAGS.SETTINGS);
}

/** Cache for public announcement bar - reference profile */
export function cacheStoreAnnouncement() {
	cacheLife("reference");
	cacheTag(STORE_SETTINGS_CACHE_TAGS.ANNOUNCEMENT);
}

// ============================================================================
// INVALIDATION
// ============================================================================

/** Get all tags to invalidate when store settings change */
export function getStoreSettingsInvalidationTags(): string[] {
	return [
		STORE_SETTINGS_CACHE_TAGS.STATUS,
		STORE_SETTINGS_CACHE_TAGS.SETTINGS,
		STORE_SETTINGS_CACHE_TAGS.ANNOUNCEMENT,
	];
}
