/** Minimum upward swipe distance (px) to trigger dismiss on mobile */
export const SWIPE_DISMISS_THRESHOLD = 30;

/** Validate that a link is a safe relative or https URL */
export function isSafeLink(href: string): boolean {
	return href.startsWith("/") || href.startsWith("https://");
}
