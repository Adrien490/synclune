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

/** Configuration du pinch-to-zoom mobile */
export const PINCH_ZOOM_CONFIG = {
	/** Échelle minimum (1 = taille normale) */
	MIN_SCALE: 1,
	/** Échelle maximum */
	MAX_SCALE: 3,
	/** Échelle appliquée au double-tap */
	DOUBLE_TAP_SCALE: 2,
	/** Délai pour détecter un double-tap (ms) */
	DOUBLE_TAP_DELAY: 300,
	/** Incrément de zoom au clavier (+/-) */
	KEYBOARD_ZOOM_STEP: 0.5,
	/** Incrément de pan au clavier (flèches, px) */
	KEYBOARD_PAN_STEP: 50,
} as const;

// ============================================
// PREFETCH
// ============================================

/** Nombre d'images adjacentes à prefetch sur connexion lente (2G/slow-2G) */
export const PREFETCH_RANGE_SLOW = 1;

/** Nombre d'images adjacentes à prefetch sur connexion rapide */
export const PREFETCH_RANGE_FAST = 2;
