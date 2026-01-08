"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { deleteUploadThingFilesSchema } from "@/modules/media/schemas/uploadthing.schemas";
import { extractFileKeysFromUrls } from "@/modules/media/utils/extract-file-key";

/**
 * Server Action pour supprimer un ou plusieurs fichiers d'UploadThing
 * Compatible avec useActionState de React 19
 */
export async function deleteUploadThingFiles(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des donnees du FormData avec parsing JSON securise
		const fileUrlsRaw = formData.get("fileUrls");

		if (fileUrlsRaw === null || fileUrlsRaw === undefined) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Les URLs de fichiers sont requises",
			};
		}

		if (typeof fileUrlsRaw !== "string") {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Les URLs de fichiers doivent etre un JSON string",
			};
		}

		let parsedFileUrls: unknown;
		try {
			parsedFileUrls = JSON.parse(fileUrlsRaw);
		} catch (error) {
			console.error(
				"[deleteUploadThingFiles] JSON parse failed:",
				error instanceof Error ? error.message : String(error)
			);
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format JSON invalide pour les URLs de fichiers",
			};
		}

		// 3. Validation avec Zod
		const result = deleteUploadThingFilesSchema.safeParse({ fileUrls: parsedFileUrls });

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { fileUrls } = result.data;

		// 4. Extraire les cles des URLs avec gestion d'erreur
		const { keys: fileKeys, failedUrls } = extractFileKeysFromUrls(fileUrls);

		if (fileKeys.length === 0) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Impossible d'extraire les cles des fichiers depuis les URLs",
			};
		}

		if (failedUrls.length > 0) {
			console.warn(
				`[deleteUploadThingFiles] ${failedUrls.length} URL(s) n'ont pas pu etre extraites:`,
				failedUrls
			);
		}

		// 5. Supprimer les fichiers via UTApi (instanciation par requete)
		const utapi = new UTApi();
		await utapi.deleteFiles(fileKeys);

		// 6. Success
		return {
			status: ActionStatus.SUCCESS,
			message: `${fileKeys.length} fichier(s) supprimé(s)`,
			data: {
				deletedCount: fileKeys.length,
			},
		};
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression des fichiers");
	}
}
