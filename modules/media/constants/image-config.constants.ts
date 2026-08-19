/**
 * Centralized configuration for gallery image optimization
 */

// ============================================
// IMAGE SIZES
// ============================================

/**
 * Largeurs générées par l'optimiseur d'images Next.
 *
 * ⚠️ Miroir des `images.deviceSizes` DÉCLARÉS dans `next.config.ts` (M17 —
 * ils y sont explicites depuis l'audit), utilisée pour construire à la main le
 * `srcSet` de la lightbox via `nextImageUrl()`. Une largeur ajoutée ici sans
 * son pendant dans `next.config.ts` produirait des URLs `/_next/image?w=…`
 * rejetées en 400. La parité des deux listes est verrouillée par
 * `image-config.constants.test.ts`.
 */
export const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048] as const;

// ============================================
// IMAGE QUALITY
// ============================================

/**
 * Paliers de qualité — SSOT alignée sur `images.qualities` de `next.config.ts`.
 *
 * ⚠️ COÛT : Vercel facture chaque couple (source, largeur, qualité) distinct.
 * Le catalogue utilisait 7 valeurs (60/65/70/75/80/85/90), ramenées à 3, puis à
 * **2** par l'audit coûts (P2-5).
 *
 * Pourquoi supprimer le palier 90 plutôt qu'un autre : `STANDARD` (80) et
 * `HERO` (90) s'appliquaient aux MÊMES sources aux MÊMES largeurs — une image
 * produit est à la fois carte de grille (STANDARD) et image principale PDP
 * (HERO), et `product-carousel-ui` demandait même les deux dans un seul
 * composant. Chaque source était donc transformée deux fois pour un écart AVIF
 * imperceptible. `THUMBNAIL` (65), lui, sert des largeurs disjointes (≤ 120 px)
 * et ne double rien : le fusionner n'aurait presque rien économisé.
 *
 * Fusionner vers 80 plutôt que vers 90 réduit AUSSI les octets servis sur la
 * PDP et la lightbox — le poste bande passante y gagne en même temps.
 *
 * N'AJOUTER une valeur qu'avec une raison mesurée, et la déclarer aussi dans
 * `next.config.ts` (sinon 400 sur `/_next/image`).
 */
export const IMAGE_QUALITY = {
	/** Vignettes et miniatures (≤ 120 px) : la compression ne se voit pas. */
	THUMBNAIL: 65,
	/**
	 * Tout le reste — cartes produit, grilles, panier, image principale PDP,
	 * lightbox, hero. Un seul palier pour que ces surfaces PARTAGENT leurs
	 * variantes au lieu d'en facturer deux jeux.
	 */
	STANDARD: 80,
} as const;

/** Quality for lightbox images. Partage les variantes du reste du catalogue. */
export const LIGHTBOX_QUALITY = IMAGE_QUALITY.STANDARD;

/** Quality for gallery thumbnails */
export const THUMBNAIL_IMAGE_QUALITY = IMAGE_QUALITY.THUMBNAIL;

/**
 * Quality for the gallery main image.
 *
 * Aligné sur `LIGHTBOX_QUALITY` : l'image principale et la lightbox partagent
 * la même source, donc les mêmes variantes optimisées sont réutilisées.
 */
export const MAIN_IMAGE_QUALITY = IMAGE_QUALITY.STANDARD;

// ============================================
// PREFETCH
// ============================================

/** Prefetched image size on mobile (viewport < 768px) */
export const PREFETCH_SIZE_MOBILE = 640;

/** Prefetched image size on desktop (viewport >= 768px) */
export const PREFETCH_SIZE_DESKTOP = 1080;

// ============================================
// LOADING
// ============================================

/**
 * Number of thumbnails to load eagerly (above the fold).
 * 2 seulement : la galerie est derrière un Suspense, des vignettes eager
 * supplémentaires concurrencent le LCP (image principale) sur mobile 4G.
 */
export const EAGER_LOAD_THUMBNAILS = 2;

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
export const GALLERY_MAIN_SIZES =
	"(min-width: 1024px) min(55vw, 640px), (min-width: 768px) calc(100vw - 100px), 100vw";

// ============================================
// HELPERS
// ============================================

/**
 * Generates an optimized Next.js image URL.
 * Used for lightbox slides that require custom srcSets.
 */
export function nextImageUrl(src: string, size: number, quality = LIGHTBOX_QUALITY): string {
	return `/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=${quality}`;
}
