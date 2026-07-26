/**
 * SSOT des breakpoints responsive — **en rem, jamais en px**.
 *
 * ## Pourquoi rem
 *
 * Tailwind v4 exprime ses breakpoints en rem (`md:` = `48rem`). Tant que la
 * police racine vaut 16px, `48rem === 768px` et un seuil JS écrit en px semble
 * équivalent. Il ne l'est pas : dès que l'utilisateur change la taille de police
 * par défaut de son navigateur (réglage d'accessibilité courant, WCAG 1.4.4),
 * les breakpoints CSS se déplacent et les seuils JS en px restent figés.
 *
 * Les composants « hybrides » — branche choisie en JS, branche rendue avec une
 * classe `md:` — tombent alors dans le vide. Cas historique (audit responsive
 * 2026-07-26) : à police racine 14px, `md:` = 672px ; entre 672 et 767px,
 * `useIsMobile()` renvoyait `true` (seuil px) pendant que le CSS considérait
 * déjà l'écran comme desktop, laissant `/admin` **sans aucune surface de
 * navigation** — ni rail, ni sheet, ni bottom bar, ni burger.
 *
 * En rem des deux côtés, les deux mécanismes bougent ensemble et le layout
 * continue de refluer au zoom texte (gain WCAG 1.4.4 / 1.4.10).
 *
 * ## Règle
 *
 * Jamais de largeur en px dans un `matchMedia()`, jamais de littéral de largeur
 * dans une classe Tailwind (`min-[400px]:`). Passer par {@link mediaBelow} /
 * {@link mediaAtLeast} et par les variants standards.
 *
 * ## Syntaxe range (Media Queries Level 4)
 *
 * Les helpers émettent `(width < 48rem)` plutôt que `(max-width: 47.9375rem)`.
 * C'est l'équivalent exact du `not (min-width: 48rem)` que Tailwind compile pour
 * `max-md:`, ce qui supprime la fenêtre de désaccord d'~1px que produisait
 * l'ancien `(max-width: 767px)` sur les DPR fractionnaires (Windows à 125%).
 */

/**
 * Échelle alignée sur les défauts Tailwind v4, plus `xs` (déclaré côté CSS dans
 * `app/globals.css` via `--breakpoint-xs`).
 *
 * `xs` (23.4375rem = 375px @16px) cible les très petits écrans (iPhone SE, mini
 * Android) et s'active avant le `sm:` standard.
 */
export const BREAKPOINTS = {
	xs: 23.4375,
	sm: 40,
	md: 48,
	lg: 64,
	xl: 80,
	"2xl": 96,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Media query « strictement en dessous du breakpoint » — équivalent du variant
 * Tailwind `max-{bp}:`.
 *
 * @example
 * const isMobile = useMediaQuery(mediaBelow("md")); // "(width < 48rem)"
 */
export function mediaBelow(breakpoint: Breakpoint): string {
	return `(width < ${BREAKPOINTS[breakpoint]}rem)`;
}

/**
 * Media query « au niveau du breakpoint ou au-dessus » — équivalent du variant
 * Tailwind `{bp}:`.
 *
 * @example
 * const isDesktop = useMediaQuery(mediaAtLeast("md")); // "(width >= 48rem)"
 */
export function mediaAtLeast(breakpoint: Breakpoint): string {
	return `(width >= ${BREAKPOINTS[breakpoint]}rem)`;
}

/**
 * Media query bornée `[min, max)` — utile pour isoler une plage de tablette.
 *
 * @example
 * mediaBetween("md", "lg"); // "(width >= 48rem) and (width < 64rem)"
 */
export function mediaBetween(min: Breakpoint, max: Breakpoint): string {
	return `${mediaAtLeast(min)} and ${mediaBelow(max)}`;
}
