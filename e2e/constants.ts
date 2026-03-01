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
 * Do NOT use for state-dependent data (orders, reviews) or UI variants (SKU selection).
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
