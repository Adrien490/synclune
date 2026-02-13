/**
 * Constantes pour les couleurs des étapes du processus créatif
 * Centralise les classes Tailwind pour cohérence et maintenabilité
 */

export const STEP_COLORS = {
	/** Couleur primaire (rose profond) - Pour étapes signature */
	primary:
		"bg-primary text-primary-foreground border-primary group-hover:border-primary/80",
	/** Couleur secondaire (doré) - Pour étapes de création */
	secondary:
		"bg-secondary text-secondary-foreground border-secondary group-hover:border-secondary/80",
	/** Couleur accent (décoratif) - Pour alternance visuelle */
	accent:
		"bg-accent text-accent-foreground border-accent group-hover:border-accent/80",
} as const;

/** Number of steps in the creative process (used by ActiveStepTracker) */
export const PROCESS_STEPS_COUNT = 4;
