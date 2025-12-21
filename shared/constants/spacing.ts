/**
 * Design tokens pour l'espacement vertical des sections
 * Système unifié pour cohérence visuelle et rythme
 */

export const SECTION_PADDING = {
	xs: "py-6 sm:py-8" as const,
	sm: "py-8 sm:py-10 lg:py-12" as const,
	md: "py-12 lg:py-16" as const,
	lg: "py-16 lg:py-24" as const,
	xl: "py-20 lg:py-32" as const,
} as const;

export const SECTION_SPACING = {
	/**
	 * Espacement minimal pour espace client (avec sidebar)
	 * Usage : /compte, /commandes, /favoris, /parametres
	 */
	minimal: SECTION_PADDING.xs,

	/**
	 * Espacement réduit pour pages informatives
	 * Usage : /personnalisation
	 */
	compact: SECTION_PADDING.sm,

	/**
	 * Espacement standard pour pages catalogue
	 * Usage : /produits, /collections, /creations/[slug]
	 */
	default: SECTION_PADDING.md,

	/**
	 * Espacement large pour sections homepage
	 * Usage : LatestCreations, Collections, CreativeProcess
	 */
	section: SECTION_PADDING.lg,

	/**
	 * Espacement extra-large pour hero/featured
	 * Usage : Hero, AtelierStory
	 */
	spacious: SECTION_PADDING.xl,
} as const;

/**
 * Container max-width standard
 * Usage : Tous les conteneurs principaux
 */
export const CONTAINER_MAX_WIDTH = "max-w-6xl" as const;

/**
 * Container padding horizontal responsive
 * Usage : Tous les conteneurs principaux
 */
export const CONTAINER_PADDING = "px-4 sm:px-6 lg:px-8" as const;

/**
 * Helper pour construire une classe container complète
 */
export const CONTAINER_CLASS = `${CONTAINER_MAX_WIDTH} mx-auto ${CONTAINER_PADDING}` as const;

/**
 * Footer padding vertical
 * Usage : Footer principal
 * Note: pb-24 sur mobile pour éviter que BottomActionBar cache le contenu
 */
export const FOOTER_PADDING = "py-12 pb-24 md:pb-12" as const;

/**
 * Espacement espace client (avec padding bottom mobile pour nav)
 * Usage : /compte, /commandes, /favoris, /adresses, /parametres
 */
export const ACCOUNT_SECTION_PADDING = "py-6 sm:py-8 pb-24 lg:pb-8" as const;
