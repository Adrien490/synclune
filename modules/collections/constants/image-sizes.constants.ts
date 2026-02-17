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
