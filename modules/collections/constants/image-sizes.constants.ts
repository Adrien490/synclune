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

	// Carousel homepage: w-[clamp(200px,72vw,280px)]
	COLLECTION_CAROUSEL:
		"(max-width: 389px) 200px, (max-width: 640px) 72vw, 280px",

	COLLECTION_HERO: "(max-width: 1024px) 100vw, 50vw",
} as const;
