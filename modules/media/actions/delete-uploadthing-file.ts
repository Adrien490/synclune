"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	handleActionError,
	success,
	error,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { deleteUploadThingFileSchema } from "@/modules/media/schemas/uploadthing.schemas";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";
import { MEDIA_LIMITS } from "@/modules/media/constants/upload-limits";

/**
 * Server Action to delete an UploadThing file.
 * Compatible with React 19 useActionState.
 */
export async function deleteUploadThingFile(
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

		// 3. Extract data from FormData
		const rawData = {
			fileUrl: safeFormGet(formData, "fileUrl"),
		};

		// 4. Validate with Zod
		const validated = validateInput(deleteUploadThingFileSchema, rawData);
		if ("error" in validated) return validated.error;

		const { fileUrl } = validated.data;

		// 5. Delete via le service partagé (garde anti-suppression des archives
		// fiscales — audit média M7). Une clé déjà absente n'est pas un échec.
		const result = await deleteUploadThingFilesFromUrls([fileUrl]);

		if (result.failed > 0) {
			return error("La suppression du fichier a echoue cote UploadThing");
		}

		return success("Fichier supprime", { deletedFile: extractFileKeyFromUrl(fileUrl) });
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer le fichier");
	}
}
