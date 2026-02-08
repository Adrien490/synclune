/**
 * Configuration centralisée pour l'optimisation des images dans la galerie
 */

// ============================================
// TAILLES D'IMAGES
// ============================================

/** Tailles standard pour srcSet (petites images) */
export const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384] as const

/** Tailles d'écran (responsive breakpoints) */
export const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const

/** Taille maximale d'image pour la lightbox */
export const MAX_IMAGE_SIZE = 3840

// ============================================
// QUALITÉ D'IMAGE
// ============================================

/** Qualité pour les images en lightbox (haute qualité) */
export const LIGHTBOX_QUALITY = 90

/** Qualité pour les thumbnails de la galerie */
export const THUMBNAIL_IMAGE_QUALITY = 65

/** Qualité pour l'image principale de la galerie */
export const MAIN_IMAGE_QUALITY = 85

// ============================================
// PREFETCH
// ============================================

/** Taille d'image préchargée sur mobile (viewport < 768px) */
export const PREFETCH_SIZE_MOBILE = 640

/** Taille d'image préchargée sur desktop (viewport >= 768px) */
export const PREFETCH_SIZE_DESKTOP = 1080

// ============================================
// CHARGEMENT
// ============================================

/** Nombre de thumbnails à charger eagerly (au-dessus de la ligne de flottaison) */
export const EAGER_LOAD_THUMBNAILS = 6

// ============================================
// SIZES ATTRIBUTE (RESPONSIVE)
// ============================================

/**
 * Attribut sizes pour l'image principale de la galerie produit
 *
 * Layout page produit:
 * - Mobile (<768px): pleine largeur (100vw)
 * - Tablet (768-1023px): pleine largeur - thumbnails - padding (~calc(100vw - 100px))
 * - Desktop (>=1024px): 55% du container (max 640px) due to grid [1.1fr, 0.9fr]
 */
export const GALLERY_MAIN_SIZES = "(min-width: 1024px) min(55vw, 640px), (min-width: 768px) calc(100vw - 100px), 100vw"

// ============================================
// HELPERS
// ============================================

/**
 * Génère une URL Next.js optimisée pour les images
 * Utilisé pour les slides lightbox qui nécessitent des srcSet personnalisés
 */
export function nextImageUrl(src: string, size: number, quality = LIGHTBOX_QUALITY): string {
	return `/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=${quality}`
}

