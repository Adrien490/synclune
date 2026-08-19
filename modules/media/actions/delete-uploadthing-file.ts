"use server";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { handleActionError, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { deleteUploadThingFileSchema } from "@/modules/media/schemas/uploadthing.schemas";
import { deleteUnreferencedCatalogMedia } from "@/modules/media/services/delete-unreferenced-catalog-media.service";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";

/**
 * Server Action to delete an UploadThing file.
 * Compatible with React 19 useActionState.
 *
 * Seul appelant : le cleanup best-effort côté client
 * (`cleanupOrphanUploadedFile`) — fichiers montés puis devenus inutiles
 * (thumbnail d'une vidéo en échec, upload résolu après annulation).
 */
export async function deleteUploadThingFile(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verify admin rights
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 3. Extract data from FormData
		const rawData = {
			fileUrl: safeFormGet(formData, "fileUrl"),
		};

		// 4. Validate with Zod
		const validated = validateInput(deleteUploadThingFileSchema, rawData);
		if ("error" in validated) return validated.error;

		const { fileUrl } = validated.data;

		// 5. Delete via la garde de références partagées : une URL encore
		// pointée par une ligne `ProductMedia` (blob partagé par duplication)
		// est PRÉSERVÉE — la supprimer rendrait 404 l'image d'un autre produit.
		// L'ancien delete brut (`deleteUploadThingFilesFromUrls`) contournait
		// cette garde, que tous les autres chemins de suppression appliquent.
		// Best-effort : le service ne throw jamais (un orphelin est un coût de
		// stockage, pas une 404), l'appelant est fire-and-forget.
		await deleteUnreferencedCatalogMedia([fileUrl], { action: "deleteUploadThingFile" });

		return success("Fichier supprimé", { deletedFile: extractFileKeyFromUrl(fileUrl) });
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer le fichier");
	}
}
