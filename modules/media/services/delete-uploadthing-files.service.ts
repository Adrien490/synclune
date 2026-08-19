import { utapi } from "@/shared/lib/uploadthing";
import { extractFileKeysFromUrls } from "@/modules/media/utils/extract-file-key";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";
import { logger } from "@/shared/lib/logger";

/**
 * Shared service for deleting UploadThing files from URLs.
 *
 * LAYER EXCEPTION: This service contains side effects (UTApi.deleteFiles mutations),
 * unlike typical services/ which are pure functions. This is intentional — similar to
 * the webhooks/services/ exception documented in CLAUDE.md. The service acts as a
 * shared cleanup utility used across multiple modules and is not exposed as a
 * Server Action.
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

	// Filter to valid UploadThing URLs only (HTTPS + allowed domain).
	// Une URL hors domaine n'est PAS un échec (elle n'a rien à supprimer chez
	// UploadThing) — elle est ignorée, mais loguée pour visibilité.
	const candidateUrls = urls.filter(isValidUploadThingUrl);
	const skipped = urls.length - candidateUrls.length;
	if (skipped > 0) {
		logger.warn(`${skipped} non-UploadThing URL(s) skipped`, {
			service: "delete-uploadthing-files",
		});
	}

	if (candidateUrls.length === 0) {
		return { deleted: 0, failed: 0 };
	}

	// Extract file keys from URLs
	const { keys: fileKeys, failedUrls } = extractFileKeysFromUrls(candidateUrls);

	if (failedUrls.length > 0) {
		logger.warn(`${failedUrls.length} URL(s) could not be extracted: ${failedUrls.join(", ")}`, {
			service: "delete-uploadthing-files",
		});
	}

	if (fileKeys.length === 0) {
		return { deleted: 0, failed: failedUrls.length };
	}

	try {
		const result = await utapi.deleteFiles(fileKeys);

		if (!result.success) {
			logger.warn(`UTApi.deleteFiles returned success=false for ${fileKeys.length} key(s)`, {
				service: "delete-uploadthing-files",
			});
			// Comptabilité uniforme : seuls les CANDIDATS comptent (les URLs hors
			// domaine, déjà filtrées, ne peuvent pas « échouer » deux fois).
			return { deleted: 0, failed: fileKeys.length + failedUrls.length };
		}

		const actualDeleted = result.deletedCount;
		const alreadyAbsent = fileKeys.length - actualDeleted;

		// UTApi.deleteFiles est un bulk SANS rapport par clé : une clé inexistante
		// (fichier déjà supprimé par un run précédent interrompu avant l'écriture DB)
		// n'incrémente pas deletedCount mais n'est PAS un échec — le fichier est
		// absent, l'objectif est atteint. Compter ces clés en `failed` bloquait
		// DÉFINITIVEMENT la purge PII 10 ans après un crash entre suppression PDF et
		// scrub (le retry mensuel re-supprimait des clés déjà absentes → failed > 0 →
		// report éternel). Les vrais échecs se manifestent par success=false ou une
		// exception (catch ci-dessous).
		if (alreadyAbsent > 0) {
			logger.info(
				`${actualDeleted}/${fileKeys.length} file(s) deleted (${alreadyAbsent} already absent)`,
				{ service: "delete-uploadthing-files" },
			);
		}

		return { deleted: actualDeleted, failed: failedUrls.length };
	} catch (error) {
		// Log error but don't block the main operation
		logger.error("Failed to delete files", error, { service: "delete-uploadthing-files" });

		return { deleted: 0, failed: fileKeys.length + failedUrls.length };
	}
}
