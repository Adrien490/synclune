"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { deleteUploadThingFileSchema } from "@/modules/media/schemas/uploadthing.schemas";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";
import { MEDIA_LIMITS } from "@/modules/media/constants/upload-limits";

/**
 * Server Action to delete an UploadThing file.
 * Compatible with React 19 useActionState.
 */
export async function deleteUploadThingFile(
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

		// 3. Extract data from FormData
		const rawData = {
			fileUrl: formData.get("fileUrl") as string,
		};

		// 4. Validate with Zod
		const validated = validateInput(deleteUploadThingFileSchema, rawData);
		if ("error" in validated) return validated.error;

		const { fileUrl } = validated.data;

		// 5. Extract file key from URL
		const fileKey = extractFileKeyFromUrl(fileUrl);
		if (!fileKey) {
			return error("Impossible d'extraire la cle du fichier depuis l'URL");
		}

		// 6. Delete file via UTApi (per-request instantiation)
		const utapi = new UTApi();
		const result = await utapi.deleteFiles(fileKey);

		// 7. Verify deletion succeeded
		if (!result.success || result.deletedCount === 0) {
			return error("La suppression du fichier a echoue cote UploadThing");
		}

		return success("Fichier supprime", { deletedFile: fileKey });
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer le fichier");
	}
}
