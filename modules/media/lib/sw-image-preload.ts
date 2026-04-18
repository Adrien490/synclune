"use client";

/**
 * Service Worker image preload — stores a small pool of recently-viewed product
 * hero images in Cache Storage so subsequent PDP visits resolve instantly from
 * the SW cache, bypassing the network.
 *
 * Design constraints:
 * - Zero impact if Cache Storage or Service Workers are unavailable (best-effort).
 * - Bounded by PRELOAD_MAX_ENTRIES to stay under browser quotas (~50 Mo default).
 * - FIFO eviction: oldest cached URL is deleted when the cap is reached.
 */

export const PRELOAD_CACHE_NAME = "synclune-pdp-hero-v1";
export const PRELOAD_MAX_ENTRIES = 24;

function isCacheStorageAvailable(): boolean {
	return typeof caches !== "undefined" && typeof caches.open === "function";
}

function isServiceWorkerEnabled(): boolean {
	return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Preload a single image URL into the hero pool. Safe to call multiple times —
 * already-cached URLs are skipped.
 */
export async function preloadHeroImage(url: string): Promise<void> {
	if (!url || !isCacheStorageAvailable()) return;
	if (!isServiceWorkerEnabled()) return;
	try {
		const cache = await caches.open(PRELOAD_CACHE_NAME);
		const existing = await cache.match(url);
		if (existing) return;

		const response = await fetch(url, { mode: "no-cors", credentials: "omit" });
		// Opaque responses can still be stored — they just can't be inspected.
		await cache.put(url, response);
		await enforceCap();
	} catch {
		// Best-effort — no retry, no error surfacing to users
	}
}

/**
 * Remove cached entries beyond the FIFO cap. Called automatically after each
 * successful `preloadHeroImage()` but also exposed for manual housekeeping.
 */
export async function enforceCap(max: number = PRELOAD_MAX_ENTRIES): Promise<void> {
	if (!isCacheStorageAvailable()) return;
	try {
		const cache = await caches.open(PRELOAD_CACHE_NAME);
		const requests = await cache.keys();
		if (requests.length <= max) return;
		const toEvict = requests.slice(0, requests.length - max);
		await Promise.all(toEvict.map((req) => cache.delete(req)));
	} catch {
		// ignore
	}
}

/** Wipes the hero pool — useful on logout or storage-cleanup prompts. */
export async function clearHeroPool(): Promise<void> {
	if (!isCacheStorageAvailable()) return;
	try {
		await caches.delete(PRELOAD_CACHE_NAME);
	} catch {
		// ignore
	}
}

/** Current number of cached entries — O(n) but fast. */
export async function getPreloadedCount(): Promise<number> {
	if (!isCacheStorageAvailable()) return 0;
	try {
		const cache = await caches.open(PRELOAD_CACHE_NAME);
		const keys = await cache.keys();
		return keys.length;
	} catch {
		return 0;
	}
}
