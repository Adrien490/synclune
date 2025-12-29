"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { deleteUploadThingFilesSchema } from "@/modules/media/schemas/uploadthing.schemas";

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

		// 2. Extraction des données du FormData
		const rawData = {
			fileUrls: JSON.parse(formData.get("fileUrls") as string) as string[],
		};

		// 3. Validation avec Zod
		const result = deleteUploadThingFilesSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { fileUrls } = result.data;

		// 3. Extraire les clés des URLs
		const fileKeys = fileUrls.map(extractFileKeyFromUrl);

		// 4. Supprimer les fichiers via UTApi
		await utapi.deleteFiles(fileKeys);

		// 5. Success
		return {
			status: ActionStatus.SUCCESS,
			message: `${fileKeys.length} fichier(s) supprimé(s)`,
			data: {
				deletedCount: fileKeys.length,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la suppression des fichiers",
		};
	}
}
