/**
 * Unique identifier for the current test run.
 * Used to prefix test-created data (emails, names) for reliable cleanup.
 *
 * Format: `e2e-{timestamp}` — short enough to be human-readable,
 * unique enough to avoid collisions between parallel runs.
 */
export const TEST_RUN_ID = `e2e-${Date.now()}`

/** Email domain used for all test-created accounts */
export const TEST_EMAIL_DOMAIN = "synclune-test.com"

/**
 * Generate a unique test email for this run.
 * Pattern: `e2e-{timestamp}-{suffix}@synclune-test.com`
 */
export function testEmail(suffix: string): string {
	return `${TEST_RUN_ID}-${suffix}@${TEST_EMAIL_DOMAIN}`
}

/**
 * Generate a unique test name prefix for this run.
 * Useful for identifying test-created records (addresses, etc.)
 */
export function testName(base: string): string {
	return `${base}-${TEST_RUN_ID}`
}

/**
 * Pattern that matches ALL test-created emails (across any run).
 * Used by global teardown for cleanup.
 */
export const TEST_EMAIL_PATTERN = `e2e-%@${TEST_EMAIL_DOMAIN}`
