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
 * @example
 * extractFileKeyFromUrl("https://utfs.io/f/abc123.png") // "abc123.png"
 * extractFileKeyFromUrl("invalid-url") // null
 */
export function extractFileKeyFromUrl(url: string): string | null {
	try {
		// UploadThing format: https://utfs.io/f/{fileKey}
		// or https://uploadthing-prod.s3.us-west-2.amazonaws.com/{fileKey}
		// or https://x1ain1wpub.ufs.sh/f/{fileKey}
		const urlObj = new URL(url);
		const parts = urlObj.pathname.split("/");
		// The key is the last segment of the path
		const key = parts[parts.length - 1];

		// Basic validation: key must be non-empty and contain only safe characters
		if (!key || key === "/" || !/^[a-zA-Z0-9._-]+$/.test(key)) {
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
