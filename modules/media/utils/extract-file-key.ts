/**
 * Utility for extracting file keys from UploadThing URLs.
 *
 * Centralizes extraction logic to avoid duplication
 * and ensure consistent error handling.
 *
 * @module modules/media/utils/extract-file-key
 */

/**
 * Extracts the file key from an UploadThing URL.
 *
 * @param url - Full file URL (e.g. https://utfs.io/f/abc123.png)
 * @returns The file key or null if extraction fails
 *
 * ⚠️ Ne vérifie PAS l'hôte : `https://evil.com/f/x` rend `"x"`. La garde de
 * domaine appartient aux APPELANTS (schema `refine(isValidUploadThingUrl)`,
 * `filter(isValidUploadThingUrl)` du service de suppression) — tout nouvel
 * appelant doit gater l'URL AVANT d'extraire la clé.
 *
 * @example
 * extractFileKeyFromUrl("https://utfs.io/f/abc123.png") // "abc123.png"
 * extractFileKeyFromUrl("invalid-url") // null
 */
export function extractFileKeyFromUrl(url: string): string | null {
	try {
		// Formats acceptés :
		//   https://utfs.io/f/{fileKey}
		//   https://x1ain1wpub.ufs.sh/f/{fileKey}
		//   https://uploadthing-prod.s3.us-west-2.amazonaws.com/{fileKey}  (legacy)
		//
		// La forme du chemin est vérifiée (audit média M16) : l'ancienne version
		// prenait le DERNIER segment quel qu'il soit, si bien qu'une URL forgée
		// comme `https://utfs.io/f/VRAIE_CLE/autre` renvoyait `autre`. Le motif est
		// désormais ancré sur `/f/<clé>` ou sur un chemin à segment unique.
		const urlObj = new URL(url);
		const segments = urlObj.pathname.split("/").filter(Boolean);

		const key =
			segments.length === 2 && segments[0] === "f"
				? segments[1]
				: segments.length === 1
					? segments[0]
					: null;

		// Basic validation: key must be non-empty and contain only safe characters
		if (!key || !/^[a-zA-Z0-9._-]+$/.test(key)) {
			return null;
		}

		return key;
	} catch {
		// Invalid URL
		return null;
	}
}

/**
 * Extracts file keys from multiple UploadThing URLs.
 * Automatically filters out failed extractions.
 *
 * @param urls - List of full URLs
 * @returns Object with extracted keys and failed URLs
 */
export function extractFileKeysFromUrls(urls: string[]): {
	keys: string[];
	failedUrls: string[];
} {
	const keys: string[] = [];
	const failedUrls: string[] = [];

	for (const url of urls) {
		const key = extractFileKeyFromUrl(url);
		if (key) {
			keys.push(key);
		} else {
			failedUrls.push(url);
		}
	}

	return { keys, failedUrls };
}
