import { cacheLife } from "next/cache";
import { cacheTag } from "next/cache";

// ============================================================================
// SINGLETON
// ============================================================================

export const STORE_SETTINGS_SINGLETON_ID = "store-settings-singleton";

// ============================================================================
// CACHE TAGS
// ============================================================================

export const STORE_SETTINGS_CACHE_TAGS = {
	/** Store open/closed status for storefront */
	STATUS: "store-status",
	/** Admin settings view */
	SETTINGS: "store-settings",
} as const;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/** Cache for store status (storefront) - 7d stale / 24h revalidate */
export function cacheStoreStatus() {
	cacheLife("reference");
	cacheTag(STORE_SETTINGS_CACHE_TAGS.STATUS);
}

/** Cache for admin settings - 1m stale / 30s revalidate */
export function cacheStoreSettings() {
	cacheLife("dashboard");
	cacheTag(STORE_SETTINGS_CACHE_TAGS.SETTINGS);
}

// ============================================================================
// INVALIDATION
// ============================================================================

/** Get all tags to invalidate when store settings change */
export function getStoreSettingsInvalidationTags(): string[] {
	return [STORE_SETTINGS_CACHE_TAGS.STATUS, STORE_SETTINGS_CACHE_TAGS.SETTINGS];
}
