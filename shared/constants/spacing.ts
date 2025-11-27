/**
 * Design tokens pour l'espacement vertical des sections
 * Système unifié pour cohérence visuelle et rythme
 */

export const SECTION_PADDING = {
	sm: "py-12 lg:py-16" as const,
	md: "py-16 lg:py-24" as const,
	lg: "py-20 lg:py-32" as const,
} as const;

export const SECTION_SPACING = {
	/**
	 * Espacement standard pour sections principales
	 * Usage : Collections, New Arrivals, Shop by Type
	 */
	default: SECTION_PADDING.md,

	/**
	 * Espacement réduit pour sections secondaires
	 * Usage : Témoignages, Newsletter, etc.
	 */
	compact: SECTION_PADDING.sm,

	/**
	 * Espacement large pour sections hero/featured
	 * Usage : Hero, About (mise en avant)
	 */
	spacious: SECTION_PADDING.lg,
} as const;
