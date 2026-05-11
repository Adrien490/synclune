import { z } from "zod";

import { isAllowedMediaDomain, ALLOWED_MEDIA_DOMAINS } from "@/shared/lib/media-validation";
import { TEXT_LIMITS } from "@/shared/constants/validation-limits";

/**
 * Helper pour validation des URLs de medias
 * Utilise la fonction centralisee avec tous les domaines autorises
 */
const validateMediaUrl = (url: string): boolean => isAllowedMediaDomain(url, ALLOWED_MEDIA_DOMAINS);

/**
 * Schema pour un media (image ou video)
 * Securise: n'accepte que les URLs provenant de domaines autorises
 */
export const imageSchema = z.object({
	url: z.string().url({ message: "L'URL du media doit être valide" }).refine(validateMediaUrl, {
		message: "L'URL du média doit provenir d'un domaine autorisé",
	}),
	thumbnailUrl: z
		.string()
		.url()
		.refine(validateMediaUrl, {
			message: "L'URL de la miniature doit provenir d'un domaine autorisé",
		})
		.optional()
		.nullable(),
	blurDataUrl: z.string().max(10000).optional(),
	altText: z.string().max(TEXT_LIMITS.MEDIA_ALT_TEXT.max).optional(),
	mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
});
