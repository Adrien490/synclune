/**
 * Centralized configuration for the Gallery component
 */

// ============================================
// ZOOM DESKTOP (Hover)
// ============================================

/** Zoom level for desktop hover zoom (2x or 3x) */
export const GALLERY_ZOOM_LEVEL = 3 as const;

// ============================================
// ZOOM MOBILE (Pinch)
// ============================================

/** Mobile pinch-to-zoom configuration (camelCase format for shared/hooks/use-pinch-zoom) */
export const PINCH_ZOOM_CONFIG = {
	/** Minimum scale (1 = normal size) */
	minScale: 1,
	/** Maximum scale */
	maxScale: 3,
	/** Scale applied on double-tap */
	doubleTapScale: 2,
	/** Delay to detect a double-tap (ms) */
	doubleTapDelay: 300,
	/** Keyboard zoom increment (+/-) */
	keyboardZoomStep: 0.5,
	/** Keyboard pan increment (arrows, px) */
	keyboardPanStep: 50,
	/** Minimum distance (px) before invalidating a double-tap */
	moveThreshold: 10,
} as const;

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
