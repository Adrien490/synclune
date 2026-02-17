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
		await utapi.deleteFiles(fileKeys);

		// 7. Success (with warning for partial failures)
		if (failedUrls.length > 0) {
			return success(
				`${fileKeys.length} fichier(s) supprime(s). ${failedUrls.length} URL(s) n'ont pas pu etre traitee(s).`,
				{ deletedCount: fileKeys.length, failedCount: failedUrls.length }
			);
		}
		return success(`${fileKeys.length} fichier(s) supprime(s)`, { deletedCount: fileKeys.length });
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression des fichiers");
	}
}
