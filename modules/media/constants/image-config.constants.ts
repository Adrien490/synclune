/**
 * Centralized configuration for gallery image optimization
 */

// ============================================
// IMAGE SIZES
// ============================================

/** Standard sizes for srcSet (small images) */
export const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384] as const

/** Screen sizes (responsive breakpoints) */
export const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const

/** Maximum image size for the lightbox */
export const MAX_IMAGE_SIZE = 3840

// ============================================
// IMAGE QUALITY
// ============================================

/** Quality for lightbox images (high quality) */
export const LIGHTBOX_QUALITY = 90

/** Quality for gallery thumbnails */
export const THUMBNAIL_IMAGE_QUALITY = 65

/** Quality for the gallery main image */
export const MAIN_IMAGE_QUALITY = 85

// ============================================
// PREFETCH
// ============================================

/** Prefetched image size on mobile (viewport < 768px) */
export const PREFETCH_SIZE_MOBILE = 640

/** Prefetched image size on desktop (viewport >= 768px) */
export const PREFETCH_SIZE_DESKTOP = 1080

// ============================================
// LOADING
// ============================================

/** Number of thumbnails to load eagerly (above the fold) */
export const EAGER_LOAD_THUMBNAILS = 6

// ============================================
// SIZES ATTRIBUTE (RESPONSIVE)
// ============================================

/**
 * Sizes attribute for the product gallery main image
 *
 * Product page layout:
 * - Mobile (<768px): full width (100vw)
 * - Tablet (768-1023px): full width - thumbnails - padding (~calc(100vw - 100px))
 * - Desktop (>=1024px): 55% of container (max 640px) due to grid [1.1fr, 0.9fr]
 */
export const GALLERY_MAIN_SIZES = "(min-width: 1024px) min(55vw, 640px), (min-width: 768px) calc(100vw - 100px), 100vw"

// ============================================
// HELPERS
// ============================================

/**
 * Generates an optimized Next.js image URL.
 * Used for lightbox slides that require custom srcSets.
 */
export function nextImageUrl(src: string, size: number, quality = LIGHTBOX_QUALITY): string {
	return `/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=${quality}`
}

