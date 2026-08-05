// Shared E2E test constants

/** Common timeout values (ms) */
export const TIMEOUTS = {
	/** Form validation feedback */
	VALIDATION: 3000,
	/** General UI feedback (toasts, alerts) */
	FEEDBACK: 5000,
	/** Async data loading (tables, KPIs) */
	DATA_LOAD: 10000,
	/** Auth redirects, Stripe iframe */
	AUTH_REDIRECT: 15000,
} as const;

/**
 * Viewports partagés. Étaient dupliqués littéralement dans 8 specs — un seuil
 * changé d'un côté et pas de l'autre ne se voyait nulle part.
 */
export const VIEWPORTS = {
	/** iPhone 14 portrait — référence mobile du repo. */
	MOBILE: { width: 390, height: 844 },
	/**
	 * WCAG 1.4.10 Reflow : le critère exige 320 CSS px, pas moins. L'ancien
	 * 195×422 (390 ÷ 2) était plus sévère que la norme sans en être un
	 * sur-ensemble utile — il masquait les défauts qui n'apparaissent qu'entre
	 * 195 et 320px sur une grille `grid-cols-2`.
	 */
	REFLOW_320: { width: 320, height: 512 },
	/** iPad portrait — tombe dans la plage 48-64rem (bottom-nav boutique). */
	TABLET_PORTRAIT: { width: 768, height: 1024 },
	/** iPad paysage. */
	TABLET_LANDSCAPE: { width: 1024, height: 768 },
	/** Desktop de référence. */
	DESKTOP: { width: 1280, height: 800 },
	/**
	 * Desktop large — seule largeur où le plafond admin `max-w-[100rem]` (1600px)
	 * est atteint : à 1280, il est plafonné par le viewport et ne se voit jamais.
	 */
	ADMIN_DESKTOP: { width: 1680, height: 1050 },
} as const;

/** Shared selectors used across page objects */
export const SELECTORS = {
	/** Product link pattern - matches /creations/{slug} */
	PRODUCT_LINK: 'a[href*="/creations/"]',
} as const;

/**
 * Requires seed data to be present for a test to run.
 * - In CI: fails the test immediately (seed data is guaranteed by the pipeline).
 * - In local dev: skips the test gracefully.
 *
 * Use this for data that the seed script guarantees (products, collections).
 * Do NOT use for state-dependent data (orders) or UI variants (SKU selection).
 */
export function requireSeedData(
	testFn: { skip: (condition: boolean, message: string) => void },
	condition: boolean,
	message: string,
): void {
	if (condition) return;
	if (process.env.CI) {
		throw new Error(`[CI] Seed data missing: ${message}`);
	}
	testFn.skip(true, message);
}
