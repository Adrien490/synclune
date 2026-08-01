import { z } from "zod";

import { isAllowedMediaDomain, ALLOWED_MEDIA_DOMAINS } from "@/shared/lib/media-validation";
import { VIDEO_EXTENSIONS } from "@/modules/media/constants/media-limits.constants";
import { blurDataUrlSchema, mediaDimensionSchema } from "@/shared/schemas/media.schema";
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
export const imageSchema = z
	.object({
		url: z
			.url({ message: "L'URL du media doit être valide" })
			.max(TEXT_LIMITS.MEDIA_URL.max, "L'URL du média est trop longue")
			.refine(validateMediaUrl, {
				message: "L'URL du média doit provenir d'un domaine autorisé",
			}),
		thumbnailUrl: z
			.url()
			.max(TEXT_LIMITS.MEDIA_URL.max, "L'URL de la miniature est trop longue")
			.refine(validateMediaUrl, {
				message: "L'URL de la miniature doit provenir d'un domaine autorisé",
			})
			.optional()
			.nullable(),
		blurDataUrl: blurDataUrlSchema.optional(),
		altText: z.string().max(TEXT_LIMITS.MEDIA_ALT_TEXT.max).optional(),
		mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
		width: mediaDimensionSchema.optional().nullable(),
		height: mediaDimensionSchema.optional().nullable(),
	})
	.refine(
		// `mediaType` est déclaré par le CLIENT et persisté tel quel : sans ce
		// recoupement, un payload RPC `{ url: "….mp4", mediaType: "IMAGE" }`
		// contournait tous les refines « premier média = image » et la vidéo
		// remontait dans les selects filtrés `mediaType: "IMAGE"` (carrousel,
		// collections, quick-search) et dans le snapshot OrderItem.
		(media) =>
			media.mediaType !== "IMAGE" ||
			!VIDEO_EXTENSIONS.some((ext) => media.url.toLowerCase().endsWith(ext)),
		{ message: "Un fichier vidéo ne peut pas être déclaré comme image" },
	);
