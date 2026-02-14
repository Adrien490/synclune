/**
 * Centralized configuration for the Gallery component
 */

// ============================================
// VIDEO
// ============================================

/** Timeout before showing an error if the video fails to load (ms) */
export const VIDEO_LOAD_TIMEOUT = 30_000;

// ============================================
// PREFETCH
// ============================================

/** Number of adjacent images to prefetch on slow connection (2G/slow-2G) */
export const PREFETCH_RANGE_SLOW = 1;

/** Number of adjacent images to prefetch on fast connection */
export const PREFETCH_RANGE_FAST = 2;
