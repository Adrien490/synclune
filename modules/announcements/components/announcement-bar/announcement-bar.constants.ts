/** Minimum upward swipe distance (px) to trigger dismiss on mobile */
export const SWIPE_DISMISS_THRESHOLD = 30;

/** Show the FOMO countdown pill only when remaining time is below this threshold (24h) */
export const COUNTDOWN_DISPLAY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Validate that a link is a safe relative or https URL */
export function isSafeLink(href: string): boolean {
	return href.startsWith("/") || href.startsWith("https://");
}
