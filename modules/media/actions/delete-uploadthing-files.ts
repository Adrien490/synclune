"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
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
	formData: FormData
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

		if (fileUrlsRaw === null || fileUrlsRaw === undefined) {
			return error("Les URLs de fichiers sont requises");
		}

		if (typeof fileUrlsRaw !== "string") {
			return error("Les URLs de fichiers doivent etre un JSON string");
		}

		let parsedFileUrls: unknown;
		try {
			parsedFileUrls = JSON.parse(fileUrlsRaw);
		} catch (parseError) {
			console.error(
				"[deleteUploadThingFiles] JSON parse failed:",
				parseError instanceof Error ? parseError.message : String(parseError)
			);
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
			console.warn(
				`[deleteUploadThingFiles] ${failedUrls.length} URL(s) n'ont pas pu etre extraites:`,
				failedUrls
			);
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
				`${actualDeleted} fichier(s) supprime(s). ${totalFailed} fichier(s) n'ont pas pu etre traite(s).`,
				{ deletedCount: actualDeleted, failedCount: totalFailed }
			);
		}
		return success(`${actualDeleted} fichier(s) supprime(s)`, { deletedCount: actualDeleted });
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression des fichiers");
	}
}
