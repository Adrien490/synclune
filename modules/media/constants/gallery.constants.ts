/**
 * Configuration centralisée pour le composant Gallery
 */

// ============================================
// ZOOM
// ============================================

/** Niveau de zoom pour le hover zoom desktop (2x ou 3x) */
export const GALLERY_ZOOM_LEVEL = 3 as const;

// ============================================
// PREFETCH
// ============================================

/** Nombre d'images adjacentes à prefetch sur connexion lente (2G/slow-2G) */
export const PREFETCH_RANGE_SLOW = 1;

/** Nombre d'images adjacentes à prefetch sur connexion rapide */
export const PREFETCH_RANGE_FAST = 2;
