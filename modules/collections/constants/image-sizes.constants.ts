/**
 * Tailles d'images pour les collections optimisees pour performance
 *
 * Basees sur la grille responsive:
 * - Mobile/Tablet (< 1024px): 2 colonnes = ~50vw par carte
 * - Desktop lg (1024-1279px): 3 colonnes = ~33vw par carte
 * - Desktop xl (>= 1280px): 4 colonnes = ~25vw par carte
 */
export const COLLECTION_IMAGE_SIZES = {
	// Grid page collections: grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
	COLLECTION_CARD:
		"(max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw",

	// Carousel homepage: basis-[clamp(200px,72vw,280px)] md:basis-1/3 lg:basis-1/4
	COLLECTION_CAROUSEL:
		"(max-width: 389px) 200px, (max-width: 640px) 72vw, (max-width: 767px) 280px, (max-width: 1023px) 33vw, 25vw",

	COLLECTION_HERO: "(max-width: 1024px) 100vw, 50vw",

	// Menu mobile: 48x48px (size-12)
	MENU_MOBILE: "48px",

	// Menu desktop dropdown: 64x64px (w-16 h-16)
	MENU_DESKTOP: "64px",
} as const;

/**
 * Tailles d'images compactes pour le mega menu navbar
 *
 * Container max-w-6xl (1152px) - padding lg:px-8 (64px) - gaps (36px)
 * = ~1052px utile / 4 colonnes = ~263px par carte max
 */
export const COLLECTION_IMAGE_SIZES_COMPACT = {
	SINGLE: "250px",
	BENTO_MAIN: "180px",
	BENTO_SECONDARY: "90px",
	TWO_IMAGES: "130px",
	THREE_IMAGES: "130px",
} as const;

/**
 * Qualite d'image standardisee pour les collections
 * Balance entre qualite visuelle et taille du fichier
 */
export const COLLECTION_IMAGE_QUALITY = 85;

/**
 * Seuil pour detection above-the-fold
 * Les images avec index < ce seuil sont preloadees avec priority
 */
export const ABOVE_FOLD_THRESHOLD = 4;
