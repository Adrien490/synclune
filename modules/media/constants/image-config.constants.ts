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
export const LIGHTBOX_QUALITY = 95

/** Qualité pour les thumbnails de la galerie */
export const THUMBNAIL_IMAGE_QUALITY = 65

/** Qualité pour l'image principale de la galerie */
export const MAIN_IMAGE_QUALITY = 85

// ============================================
// CHARGEMENT
// ============================================

/** Nombre de thumbnails à charger eagerly (au-dessus de la ligne de flottaison) */
export const EAGER_LOAD_THUMBNAILS = 6

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

/**
 * Génère un srcSet complet pour une image
 * Combine IMAGE_SIZES et DEVICE_SIZES jusqu'à MAX_IMAGE_SIZE
 */
export function generateSrcSet(src: string, quality = LIGHTBOX_QUALITY): Array<{ src: string; width: number; height: number }> {
	return [...IMAGE_SIZES, ...DEVICE_SIZES]
		.filter((size) => size <= MAX_IMAGE_SIZE)
		.map((size) => ({
			src: nextImageUrl(src, size, quality),
			width: size,
			height: size,
		}))
}
