import { z } from "zod";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";

// ============================================================================
// UPLOADTHING SCHEMAS
// ============================================================================

/**
 * Schema URL pour les fichiers UploadThing
 * Valide que l'URL est bien formee et provient d'un domaine UploadThing autorise
 */
const uploadThingUrlSchema = z
	.string()
	.url({ message: "URL du fichier invalide" })
	.refine(isValidUploadThingUrl, {
		message: "L'URL doit provenir d'un domaine UploadThing autorise (HTTPS)",
	});

/**
 * Schema pour supprimer un fichier UploadThing
 */
export const deleteUploadThingFileSchema = z.object({
	fileUrl: uploadThingUrlSchema,
});

/**
 * Schema pour supprimer plusieurs fichiers UploadThing
 */
export const deleteUploadThingFilesSchema = z.object({
	fileUrls: z.array(uploadThingUrlSchema).min(1, "Au moins une URL est requise"),
});

export type DeleteUploadThingFileInput = z.infer<typeof deleteUploadThingFileSchema>;
export type DeleteUploadThingFilesInput = z.infer<typeof deleteUploadThingFilesSchema>;
