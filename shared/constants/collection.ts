/**
 * Tailles d'images pour les collections optimisées pour performance
 */
export const COLLECTION_IMAGE_SIZES = {
	COLLECTION_CARD:
		"(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 280px, 320px",
	COLLECTION_HERO: "(max-width: 1024px) 100vw, 50vw",
} as const;
