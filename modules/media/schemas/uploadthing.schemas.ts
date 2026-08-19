import { z } from "zod";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";
import { TEXT_LIMITS } from "@/shared/constants/validation-limits";

// ============================================================================
// UPLOADTHING SCHEMAS
// ============================================================================

/**
 * URL schema for UploadThing files.
 * Validates that the URL is well-formed and comes from an authorized UploadThing domain.
 */
const uploadThingUrlSchema = z
	.url({ message: "URL du fichier invalide" })
	// `z.url()` et le refine de domaine ne bornent pas la longueur (cf. TEXT_LIMITS.MEDIA_URL).
	.max(TEXT_LIMITS.MEDIA_URL.max, "L'URL du fichier est trop longue")
	.refine(isValidUploadThingUrl, {
		message: "L'URL doit provenir d'un domaine UploadThing autorisé (HTTPS)",
	});

/**
 * Schema for deleting a single UploadThing file
 */
export const deleteUploadThingFileSchema = z.object({
	fileUrl: uploadThingUrlSchema,
});

// ⚠️ `deleteUploadThingFilesSchema` (bulk) a été retiré : l'action bulk
// n'existe pas — un schéma sans consommateur ne valide rien. À recréer le
// jour où un delete bulk naît, sur la même brique `uploadThingUrlSchema`.
