"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import type { ActionState } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { deleteUploadThingFilesSchema } from "@/modules/media/schemas/uploadthing.schemas";
import { extractFileKeysFromUrls } from "@/modules/media/utils/extract-file-key";
import { MEDIA_LIMITS } from "@/modules/media/constants/upload-limits";

/**
 * Server Action to delete one or more UploadThing files.
 * Compatible with React 19 useActionState.
 */
export async function deleteUploadThingFiles(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verify admin rights
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(MEDIA_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract data from FormData with secure JSON parsing
		const fileUrlsRaw = formData.get("fileUrls");

		if (fileUrlsRaw === null || typeof fileUrlsRaw !== "string") {
			return error("Les URLs de fichiers sont requises");
		}

		let parsedFileUrls: unknown;
		try {
			parsedFileUrls = JSON.parse(fileUrlsRaw);
		} catch (parseError) {
			logger.error("JSON parse failed for file URLs", parseError, {
				action: "delete-uploadthing-files",
			});
			return error("Format JSON invalide pour les URLs de fichiers");
		}

		// 4. Validate with Zod
		const validated = validateInput(deleteUploadThingFilesSchema, { fileUrls: parsedFileUrls });
		if ("error" in validated) return validated.error;

		const { fileUrls } = validated.data;

		// 5. Extract file keys from URLs with error handling
		const { keys: fileKeys, failedUrls } = extractFileKeysFromUrls(fileUrls);

		if (fileKeys.length === 0) {
			return error("Impossible d'extraire les cles des fichiers depuis les URLs");
		}

		if (failedUrls.length > 0) {
			logger.warn(`${failedUrls.length} URL(s) could not be extracted: ${failedUrls.join(", ")}`, {
				action: "delete-uploadthing-files",
			});
		}

		// 6. Delete files via UTApi (per-request instantiation)
		const utapi = new UTApi();
		const result = await utapi.deleteFiles(fileKeys);

		// 7. Verify deletion and report accurate counts
		const actualDeleted = result.success ? result.deletedCount : 0;
		const utFailures = result.success ? fileKeys.length - result.deletedCount : fileKeys.length;
		const totalFailed = failedUrls.length + utFailures;

		if (!result.success) {
			return error("La suppression des fichiers a echoue cote UploadThing");
		}

		if (totalFailed > 0) {
			return success(
				`${actualDeleted} fichier(s) supprimé(s). ${totalFailed} fichier(s) n'ont pas pu être traité(s).`,
				{ deletedCount: actualDeleted, failedCount: totalFailed },
			);
		}
		return success(`${actualDeleted} fichier(s) supprimé(s)`, { deletedCount: actualDeleted });
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression des fichiers");
	}
}
