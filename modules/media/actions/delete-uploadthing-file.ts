"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { deleteUploadThingFileSchema } from "@/modules/media/schemas/uploadthing.schemas";

const utapi = new UTApi();

/**
 * Extrait la clé du fichier depuis une URL UploadThing
 * @param url - URL complète du fichier (ex: https://utfs.io/f/abc123.png)
 * @returns La clé du fichier (ex: abc123.png)
 */
function extractFileKeyFromUrl(url: string): string {
	try {
		// Format UploadThing: https://utfs.io/f/{fileKey}
		// ou https://uploadthing-prod.s3.us-west-2.amazonaws.com/{fileKey}
		const urlObj = new URL(url);
		const parts = urlObj.pathname.split("/");
		// La clé est le dernier segment du path
		return parts[parts.length - 1];
	} catch {
		// Si l'URL est invalide, on retourne l'URL telle quelle
		// UTApi peut gérer les URLs complètes
		return url;
	}
}

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

		// 3. Extraire la clé de l'URL
		const fileKey = extractFileKeyFromUrl(fileUrl);

		// 4. Supprimer le fichier via UTApi
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
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la suppression du fichier",
		};
	}
}
