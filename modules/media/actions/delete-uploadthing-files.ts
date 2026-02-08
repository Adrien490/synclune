"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
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

		// 3. Validation avec Zod
		const result = deleteUploadThingFilesSchema.safeParse({ fileUrls: parsedFileUrls });

		if (!result.success) {
			return error(result.error.issues[0]?.message ?? "Erreur de validation");
		}

		const { fileUrls } = result.data;

		// 4. Extraire les cles des URLs avec gestion d'erreur
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

		// 5. Supprimer les fichiers via UTApi (instanciation par requete)
		const utapi = new UTApi();
		await utapi.deleteFiles(fileKeys);

		// 6. Success
		return success(`${fileKeys.length} fichier(s) supprime(s)`, { deletedCount: fileKeys.length });
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression des fichiers");
	}
}
