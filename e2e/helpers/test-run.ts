/**
 * Unique identifier for the current test run.
 * Used to prefix test-created data (emails, names) for reliable cleanup.
 *
 * Format: `e2e-{timestamp}` — short enough to be human-readable,
 * unique enough to avoid collisions between parallel runs.
 *
 * ⚠️ Set ONCE by `global-setup.ts` in the main process : evaluating
 * `Date.now()` here gave every worker its own ID, so any test matching data
 * created by another worker (`hasText: TEST_RUN_ID`) skipped forever. The
 * fallback only serves contexts outside a Playwright run (vitest meta-tests).
 */
export const TEST_RUN_ID = process.env.E2E_TEST_RUN_ID ?? `e2e-${Date.now()}`;

/** Email domain used for all test-created accounts */
export const TEST_EMAIL_DOMAIN = "synclune-test.com";

/**
 * Generate a unique test email for this run.
 * Pattern: `e2e-{timestamp}-{suffix}@synclune-test.com`
 */
export function testEmail(suffix: string): string {
	return `${TEST_RUN_ID}-${suffix}@${TEST_EMAIL_DOMAIN}`;
}

/**
 * Generate a unique test name prefix for this run.
 * Useful for identifying test-created records (addresses, etc.)
 */
export function testName(base: string): string {
	return `${base}-${TEST_RUN_ID}`;
}
