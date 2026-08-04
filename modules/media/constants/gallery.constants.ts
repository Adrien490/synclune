/**
 * Centralized configuration for the Gallery component
 */

// ============================================
// ZOOM DESKTOP (Hover)
// ============================================

/**
 * Zoom level for desktop hover zoom (2x or 3x).
 *
 * ⚠️ **×2 et pas ×3, parce que la source ne suit pas.** Sur la PDP à 1440 px de
 * viewport, la boîte photo fait ~439 px CSS et `GALLERY_MAIN_SIZES` en déclare
 * `min(55vw, 640px)` = 640. À ×3 la boîte vaut ~1317 px CSS pour 640 px de
 * source, soit **~2,06× de sur-agrandissement** : le survol promettait le détail
 * du bijou et rendait une image molle. À ×2 (~878 px CSS) l'upscale retombe à
 * ~1,37× — nettement plus net, **sans un octet de plus** ni une transformation
 * `/_next/image` supplémentaire, ce qui compte sur un plan où chaque couple
 * (source, largeur, qualité) est facturé (cf. `image-config.constants.ts`).
 *
 * Corollaire : ne PAS monter `GALLERY_MAIN_SIZES` pour rattraper un ×3 — c'est
 * de la bande passante sur CHAQUE visite pour un bénéfice qui n'existe qu'au
 * survol, sur desktop, à pointeur fin.
 */
export const GALLERY_ZOOM_LEVEL = 2 as const;

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

/** Timeout before showing an error if the video doesn't load (ms) */
export const VIDEO_LOAD_TIMEOUT = 30_000;

// ============================================
// PREFETCH
// ============================================

/** Number of adjacent images to prefetch on slow connection (2G/slow-2G) */
export const PREFETCH_RANGE_SLOW = 1;

/** Number of adjacent images to prefetch on fast connection */
export const PREFETCH_RANGE_FAST = 2;
