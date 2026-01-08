"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { deleteUploadThingFileSchema } from "@/modules/media/schemas/uploadthing.schemas";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";

/**
 * Server Action pour supprimer un fichier d'UploadThing
 * Compatible avec useActionState de React 19
 */
export async function deleteUploadThingFile(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des données du FormData
		const rawData = {
			fileUrl: formData.get("fileUrl") as string,
		};

		// 3. Validation avec Zod
		const result = deleteUploadThingFileSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { fileUrl } = result.data;

		// 3. Extraire la cle de l'URL
		const fileKey = extractFileKeyFromUrl(fileUrl);
		if (!fileKey) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Impossible d'extraire la cle du fichier depuis l'URL",
			};
		}

		// 4. Supprimer le fichier via UTApi (instanciation par requete)
		const utapi = new UTApi();
		await utapi.deleteFiles(fileKey);

		// 5. Success
		return {
			status: ActionStatus.SUCCESS,
			message: "Fichier supprimé",
			data: {
				deletedFile: fileKey,
			},
		};
	} catch (error) {
		return handleActionError(error, "Impossible de supprimer le fichier");
	}
}
