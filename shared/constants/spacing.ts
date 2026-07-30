/**
 * Design tokens pour l'espacement vertical des sections
 * Système unifié pour cohérence visuelle et rythme
 */

const SECTION_PADDING = {
	xs: "py-6 sm:py-8" as const,
	sm: "py-8 sm:py-10 lg:py-12" as const,
	md: "py-12 lg:py-16" as const,
	lg: "py-12 sm:py-16 lg:py-28" as const,
	xl: "py-14 sm:py-20 lg:py-36" as const,
} as const;

export const SECTION_SPACING = {
	/**
	 * Espacement minimal pour espace client (avec sidebar)
	 * Usage : /compte, /commandes, /favoris, /parametres
	 */
	minimal: SECTION_PADDING.xs,

	/**
	 * Espacement réduit pour pages informatives
	 */
	compact: SECTION_PADDING.sm,

	/**
	 * Espacement standard pour pages catalogue
	 * Usage : /produits, /collections, /creations/[slug]
	 */
	default: SECTION_PADDING.md,

	/**
	 * Espacement large pour sections homepage
	 * Usage : LatestCreations, Collections
	 */
	section: SECTION_PADDING.lg,

	/**
	 * Espacement extra-large pour hero/featured
	 * Usage : Hero, AtelierSection
	 */
	spacious: SECTION_PADDING.xl,
} as const;

/**
 * Container max-width standard
 * Usage : Tous les conteneurs principaux
 */
const CONTAINER_MAX_WIDTH = "max-w-6xl" as const;

/**
 * Container padding horizontal responsive — safe-area iOS compatible
 * Usage : Tous les conteneurs principaux.
 * Respecte env(safe-area-inset-*) pour iPhone notch/Dynamic Island en paysage.
 */
const CONTAINER_PADDING =
	"pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))] lg:pl-[max(2rem,env(safe-area-inset-left))]" as const;

/**
 * Helper pour construire une classe container complète
 */
export const CONTAINER_CLASS = `${CONTAINER_MAX_WIDTH} mx-auto ${CONTAINER_PADDING}` as const;

/**
 * Footer padding vertical
 * Usage : Footer principal
 *
 * Le pendant bas dérive de `--bottom-bar-height` — la hauteur MESURÉE de la
 * bottom-nav, publiée seulement quand elle est visible — **sans préfixe de
 * breakpoint**. C'était le dernier consommateur à figer son offset avec un
 * `md:pb-12` : depuis que la bottom-nav boutique va jusqu'à `lg`, la plage
 * 48-64rem (iPad portrait 768×1024) ne réservait plus que 48px sous une barre de
 * 56px, et la dernière rangée du footer — les liens légaux — passait dessous
 * (audit bottom-bar 2026-07-30, P2-1).
 *
 * La safe-area n'est PAS réadditionnée : elle est déjà dans la variable, et
 * `.pwa-footer` la porte de son côté pour le cas sans barre.
 */
export const FOOTER_PADDING = "py-12 pb-[calc(var(--bottom-bar-height,0px)+3rem)]" as const;
