import { z } from "zod";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";

// ============================================================================
// UPLOADTHING SCHEMAS
// ============================================================================

/**
 * URL schema for UploadThing files.
 * Validates that the URL is well-formed and comes from an authorized UploadThing domain.
 */
const uploadThingUrlSchema = z
	.string()
	.url({ message: "URL du fichier invalide" })
	.refine(isValidUploadThingUrl, {
		message: "L'URL doit provenir d'un domaine UploadThing autorise (HTTPS)",
	});

/**
 * Schema for deleting a single UploadThing file
 */
export const deleteUploadThingFileSchema = z.object({
	fileUrl: uploadThingUrlSchema,
});

/**
 * Schema for deleting multiple UploadThing files
 */
export const deleteUploadThingFilesSchema = z.object({
	fileUrls: z.array(uploadThingUrlSchema).min(1, "Au moins une URL est requise").max(100, "Maximum 100 URLs par requete"),
});

export type DeleteUploadThingFileInput = z.infer<typeof deleteUploadThingFileSchema>;
export type DeleteUploadThingFilesInput = z.infer<typeof deleteUploadThingFilesSchema>;
