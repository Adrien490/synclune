/**
 * URL constants for Newsletter module
 */

/**
 * Base URL for newsletter links (confirmation, unsubscribe)
 * Uses environment variable with fallback to localhost in dev.
 * Throws in production if BETTER_AUTH_URL is missing to prevent silent misconfiguration.
 */
function getNewsletterBaseUrl(): string {
	if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
	if (process.env.NODE_ENV === "development") return "http://localhost:3000";
	throw new Error(
		"BETTER_AUTH_URL environment variable is required in production"
	);
}

export const NEWSLETTER_BASE_URL = getNewsletterBaseUrl();
