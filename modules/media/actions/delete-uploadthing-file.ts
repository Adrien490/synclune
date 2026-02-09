"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { deleteUploadThingFileSchema } from "@/modules/media/schemas/uploadthing.schemas";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";

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

		// 2. Extract data from FormData
		const rawData = {
			fileUrl: formData.get("fileUrl") as string,
		};

		// 3. Validate with Zod
		const validated = validateInput(deleteUploadThingFileSchema, rawData);
		if ("error" in validated) return validated.error;

		const { fileUrl } = validated.data;

		// 3. Extract file key from URL
		const fileKey = extractFileKeyFromUrl(fileUrl);
		if (!fileKey) {
			return error("Impossible d'extraire la cle du fichier depuis l'URL");
		}

		// 4. Delete file via UTApi (per-request instantiation)
		const utapi = new UTApi();
		await utapi.deleteFiles(fileKey);

		// 5. Success
		return success("Fichier supprime", { deletedFile: fileKey });
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer le fichier");
	}
}
