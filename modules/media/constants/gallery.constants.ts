/**
 * Configuration centralisée pour le composant Gallery
 */

// ============================================
// ZOOM DESKTOP (Hover)
// ============================================

/** Niveau de zoom pour le hover zoom desktop (2x ou 3x) */
export const GALLERY_ZOOM_LEVEL = 3 as const;

// ============================================
// ZOOM MOBILE (Pinch)
// ============================================

/** Configuration du pinch-to-zoom mobile (format camelCase pour shared/hooks/use-pinch-zoom) */
export const PINCH_ZOOM_CONFIG = {
	/** Échelle minimum (1 = taille normale) */
	minScale: 1,
	/** Échelle maximum */
	maxScale: 3,
	/** Échelle appliquée au double-tap */
	doubleTapScale: 2,
	/** Délai pour détecter un double-tap (ms) */
	doubleTapDelay: 300,
	/** Incrément de zoom au clavier (+/-) */
	keyboardZoomStep: 0.5,
	/** Incrément de pan au clavier (flèches, px) */
	keyboardPanStep: 50,
	/** Distance minimale (px) avant d'invalider un double-tap */
	moveThreshold: 10,
} as const;

// ============================================
// VIDEO
// ============================================

/** Timeout avant d'afficher une erreur si la vidéo ne charge pas (ms) */
export const VIDEO_LOAD_TIMEOUT = 30_000;

// ============================================
// PREFETCH
// ============================================

/** Nombre d'images adjacentes à prefetch sur connexion lente (2G/slow-2G) */
export const PREFETCH_RANGE_SLOW = 1;

/** Nombre d'images adjacentes à prefetch sur connexion rapide */
export const PREFETCH_RANGE_FAST = 2;
