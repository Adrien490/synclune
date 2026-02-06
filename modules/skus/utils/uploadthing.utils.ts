import { UTApi } from "uploadthing/server";

/**
 * Extract the file key from an UploadThing URL
 * @param url - Full file URL (e.g. https://utfs.io/f/abc123.png)
 * @returns The file key (e.g. abc123.png)
 */
export function extractFileKeyFromUrl(url: string): string {
	try {
		// UploadThing format: https://utfs.io/f/{fileKey}
		// or https://uploadthing-prod.s3.us-west-2.amazonaws.com/{fileKey}
		const urlObj = new URL(url);
		const parts = urlObj.pathname.split("/");
		return parts[parts.length - 1];
	} catch {
		// If URL is invalid, return as-is — UTApi can handle full URLs
		return url;
	}
}

/**
 * Delete UploadThing files safely
 * Instantiates UTApi per request to avoid sharing tokens between workers
 */
export async function deleteUploadThingFiles(urls: string[]): Promise<void> {
	if (urls.length === 0) return;
	try {
		const utapi = new UTApi();
		const fileKeys = urls.map(extractFileKeyFromUrl);
		await utapi.deleteFiles(fileKeys);
	} catch {
		// Log error but don't block SKU deletion
		// Orphaned files will be cleaned up by a cron job
	}
}
