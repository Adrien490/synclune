import { z } from "zod";

// ============================================================================
// UPLOADTHING SCHEMAS
// ============================================================================

/**
 * Schema URL pour les fichiers UploadThing
 */
const uploadThingUrlSchema = z.string().url({ message: "URL du fichier invalide" });

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
