export const STORAGE_PREFIX = "synclune-announcement-";
export const EXIT_ANIMATION_DURATION = 350;

/** Simple string hash for versioning storageKey with message content */
export function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
	}
	return Math.abs(hash).toString(36);
}

/** Validate that a link is a safe relative or https URL */
export function isSafeLink(href: string): boolean {
	return href.startsWith("/") || href.startsWith("https://");
}
