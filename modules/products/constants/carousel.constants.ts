/**
 * Configuration du carousel de produits (Hero section)
 */
export const PRODUCT_CAROUSEL_CONFIG = {
	/** Nombre de produits à afficher dans le carousel */
	PRODUCTS_COUNT: 5,
	/** Délai entre les slides en ms (autoplay) - 5s standard e-commerce 2025 */
	AUTOPLAY_DELAY: 5000,
	/** Longueur max du alt text pour SEO */
	MAX_ALT_TEXT_LENGTH: 120,
} as const;
