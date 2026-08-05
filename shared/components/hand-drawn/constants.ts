/**
 * Vitesses et graisses du vocabulaire « fait main » — SSOT (audit 2026-08-05).
 *
 * Avant : deux durées qui s'ignoraient (accent 500 ms via
 * `MOTION_CONFIG.duration.slower`, rail 800 ms en constante locale de
 * `storefront-heading.tsx`) et cinq strokeWidth au juger (1,5 → 5). Les deux
 * vitesses sont un CHOIX (le trait souligne, le rail peint) ; l'échelle de
 * graisse a quatre crans NOMMÉS — plus de valeur libre sur un call site.
 *
 * L'easing du dessin vit en CSS : `--ease-hand` (`app/globals.css`), consommé
 * par `entrance.css`. Sa valeur doit rester égale à
 * `MOTION_CONFIG.easing.easeOut` — parité verrouillée par
 * `entrance-reduced-motion.regression.test.ts`.
 */

export const HAND_DRAWN_DURATIONS_MS = {
	/** Le trait qui souligne (accents, squiggle) — `--duration-slower`. */
	trait: 500,
	/** La touche de pinceau du rail — plus lente, elle peint. */
	rail: 800,
	/** Décalage entre deux touches du rail. */
	railStagger: 120,
} as const;

/**
 * Échelle de graisse, en unités du viewBox natif de chaque tracé.
 * fin 1,5 (glyphes admin, trait du checkout) · trait 2 (soulignés) ·
 * marqueur 2,5 (squiggle, chevrons, soulignés de panneaux) · pinceau 5 (rail).
 */
export const HAND_DRAWN_STROKES = {
	fin: 1.5,
	trait: 2,
	marqueur: 2.5,
	pinceau: 5,
} as const;
