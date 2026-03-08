import { UTApi } from "uploadthing/server";
import { extractFileKeysFromUrls } from "@/modules/media/utils/extract-file-key";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";
import { logger } from "@/shared/lib/logger";

/**
 * Shared service for deleting UploadThing files from URLs.
 *
 * LAYER EXCEPTION: This service contains side effects (UTApi.deleteFiles mutations),
 * unlike typical services/ which are pure functions. This is intentional — similar to
 * the webhooks/services/ exception documented in CLAUDE.md. The service acts as a
 * shared cleanup utility used across multiple modules (reviews, account deletion,
 * hard deletes) and is not exposed as a Server Action.
 *
 * Used for orphan file cleanup during:
 * - Review deletion (ReviewMedia)
 * - Review update (replaced photos)
 * - Account deletion (avatar)
 * - Hard delete after legal retention
 *
 * @param urls - List of file URLs to delete
 * @returns Result with count of deleted files and failures
 */
export async function deleteUploadThingFilesFromUrls(
	urls: string[],
): Promise<{ deleted: number; failed: number }> {
	if (urls.length === 0) {
		return { deleted: 0, failed: 0 };
	}

	// Filter to valid UploadThing URLs only (HTTPS + allowed domain)
	const uploadThingUrls = urls.filter(isValidUploadThingUrl);

	if (uploadThingUrls.length === 0) {
		return { deleted: 0, failed: 0 };
	}

	// Extract file keys from URLs
	const { keys: fileKeys, failedUrls } = extractFileKeysFromUrls(uploadThingUrls);

	if (failedUrls.length > 0) {
		logger.warn(`${failedUrls.length} URL(s) could not be extracted: ${failedUrls.join(", ")}`, {
			service: "delete-uploadthing-files",
		});
	}

	if (fileKeys.length === 0) {
		return { deleted: 0, failed: failedUrls.length };
	}

	try {
		const utapi = new UTApi();
		const result = await utapi.deleteFiles(fileKeys);

		if (!result.success) {
			logger.warn(`UTApi.deleteFiles returned success=false for ${fileKeys.length} key(s)`, {
				service: "delete-uploadthing-files",
			});
			return { deleted: 0, failed: urls.length };
		}

		const actualDeleted = result.deletedCount;
		const utFailures = fileKeys.length - actualDeleted;

		if (utFailures > 0) {
			logger.warn(`Partial deletion: ${actualDeleted}/${fileKeys.length} file(s) deleted`, {
				service: "delete-uploadthing-files",
			});
		}

		return { deleted: actualDeleted, failed: failedUrls.length + utFailures };
	} catch (error) {
		// Log error but don't block the main operation
		logger.error("Failed to delete files", error, { service: "delete-uploadthing-files" });

		return { deleted: 0, failed: urls.length };
	}
}

/**
 * Delete a single UploadThing file from its URL.
 * Convenience wrapper around deleteUploadThingFilesFromUrls.
 *
 * @param url - File URL to delete (can be null/undefined)
 * @returns true if the file was deleted, false otherwise
 */
export async function deleteUploadThingFileFromUrl(
	url: string | null | undefined,
): Promise<boolean> {
	if (!url || !isValidUploadThingUrl(url)) {
		return false;
	}

	const result = await deleteUploadThingFilesFromUrls([url]);
	return result.deleted > 0;
}
