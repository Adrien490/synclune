import { z } from "zod";

import { isAllowedMediaDomain, ALLOWED_MEDIA_DOMAINS } from "@/shared/lib/media-validation";
import { VIDEO_EXTENSIONS } from "@/modules/media/constants/media-limits.constants";
import { TEXT_LIMITS } from "@/shared/constants/validation-limits";

/**
 * Helper pour validation des URLs de medias
 * Utilise la fonction centralisee avec tous les domaines autorises
 */
const validateMediaUrl = (url: string): boolean => isAllowedMediaDomain(url, ALLOWED_MEDIA_DOMAINS);

/**
 * Schéma pour un média produit (image ou vidéo) — schéma lean (lot 2) :
 * ProductMedia = { url, alt, type, position }. Plus de thumbnail/blur/dimensions.
 * Sécurisé : n'accepte que les URLs provenant de domaines autorisés.
 */
export const imageSchema = z
	.object({
		url: z
			.url({ message: "L'URL du media doit être valide" })
			.max(TEXT_LIMITS.MEDIA_URL.max, "L'URL du média est trop longue")
			.refine(validateMediaUrl, {
				message: "L'URL du média doit provenir d'un domaine autorisé",
			}),
		alt: z.string().max(TEXT_LIMITS.MEDIA_ALT_TEXT.max).optional(),
		type: z.enum(["IMAGE", "VIDEO"]).optional(),
	})
	.refine(
		(media) => {
			// Cohérence type déclaré / extension vidéo connue
			if (media.type === "IMAGE") {
				const url = media.url.toLowerCase();
				return !VIDEO_EXTENSIONS.some((ext) => url.endsWith(ext));
			}
			return true;
		},
		{ message: "Un média déclaré IMAGE ne peut pas pointer un fichier vidéo" },
	);

export type ProductMediaInput = z.infer<typeof imageSchema>;
