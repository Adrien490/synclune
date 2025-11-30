/**
 * URL constants for Newsletter module
 */

/**
 * Base URL for newsletter links (confirmation, unsubscribe)
 * Uses environment variable with fallback based on environment
 */
export const NEWSLETTER_BASE_URL =
	process.env.BETTER_AUTH_URL ||
	(process.env.NODE_ENV === "development"
		? "http://localhost:3000"
		: "https://synclune.fr");
