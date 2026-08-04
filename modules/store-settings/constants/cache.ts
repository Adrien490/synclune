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
} as const;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/**
 * Cache for store status (storefront + checkout guard) — `checkout` profile
 * (1m stale / 30s revalidate). Plus court que `reference` car `getStoreStatus`
 * sert de garde de sécurité au checkout (`assertStoreOpen`) : on borne la
 * fenêtre de staleness si une invalidation `updateTag` est manquée (restore
 * Neon PITR, lag de propagation) plutôt que de risquer 24h de checkout actif
 * sur une boutique fermée. Le fallback eventual-consistency de `getStoreStatus`
 * ne couvre que fermé→ouvert, jamais ouvert→fermé (STORE-AUDIT-002).
 */
export function cacheStoreStatus() {
	cacheLife("checkout");
	cacheTag(STORE_SETTINGS_CACHE_TAGS.STATUS);
}

/** Cache for admin settings - reference profile (config quasi-statique, mutations admin invalident le tag) */
export function cacheStoreSettings() {
	cacheLife("reference");
	cacheTag(STORE_SETTINGS_CACHE_TAGS.SETTINGS);
}

// ============================================================================
// INVALIDATION
// ============================================================================

/** Get all tags to invalidate when store settings change */
export function getStoreSettingsInvalidationTags(): string[] {
	return [STORE_SETTINGS_CACHE_TAGS.STATUS, STORE_SETTINGS_CACHE_TAGS.SETTINGS];
}
