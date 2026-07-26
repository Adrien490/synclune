import { z } from "zod";
import { isAllowedMediaDomain } from "@/shared/lib/media-validation";
import { TEXT_LIMITS } from "@/shared/constants/validation-limits";

/**
 * Longueur maximale d'un placeholder blur.
 *
 * La valeur stockée est une data URL COMPLÈTE (et non le hash brut de ~35 caractères) :
 * PNG ThumbHash côté serveur, JPEG 8×8 canvas ou WebP 10×10 ffmpeg pour un poster
 * vidéo. Quelques Ko suffisent largement.
 */
const BLUR_DATA_URL_MAX_LENGTH = 10_000;

/**
 * SSOT de validation d'un `blurDataUrl` — les trois chemins d'écriture
 * (produits, SKUs, avis) divergeaient : `max(10000)` sans contrôle de format,
 * `startsWith("data:image/") + max(5000)`, et aucune contrainte du tout.
 * Cette valeur est injectée telle quelle dans l'attribut `blurDataURL` de
 * `next/image` : le préfixe doit être vérifié.
 */
export const blurDataUrlSchema = z
	.string()
	.max(BLUR_DATA_URL_MAX_LENGTH, {
		message: `Le placeholder ne doit pas dépasser ${BLUR_DATA_URL_MAX_LENGTH} caractères`,
	})
	.startsWith("data:image/", {
		message: "Le placeholder doit être une data URL d'image",
	});

/**
 * Dimension intrinsèque d'un média (px). Entier strictement positif, borné pour
 * rester coherent avec la garde image-bomb (`MAX_IMAGE_PIXELS` = 50 MP).
 */
export const mediaDimensionSchema = z.number().int().positive().max(50_000);

/**
 * Schema de base pour un media (image ou video)
 * Contient les champs communs a tous les types de medias
 */
export const baseMediaSchema = z.object({
	url: z.url({ message: "L'URL du media doit être valide" }).refine(isAllowedMediaDomain, {
		message: "L'URL du media doit provenir d'un domaine autorisé",
	}),
	blurDataUrl: blurDataUrlSchema.optional().nullable(),
	// Même SSOT que `modules/products/schemas/product-media.schemas.ts` et le
	// dialogue d'édition — audit média M3 (la colonne DB tolère 255, la règle
	// métier s'arrête à 200).
	altText: z.string().max(TEXT_LIMITS.MEDIA_ALT_TEXT.max).optional().nullable(),
});

/**
 * Schema complet pour un media avec miniature et type
 * Utilise pour les images/videos de produits et SKUs
 */
export const imageMediaSchema = baseMediaSchema.extend({
	thumbnailUrl: z
		.url()
		.refine((url) => !url || isAllowedMediaDomain(url), {
			message: "L'URL de la miniature doit provenir d'un domaine autorisé",
		})
		.optional()
		.nullable(),
	mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
	width: mediaDimensionSchema.optional().nullable(),
	height: mediaDimensionSchema.optional().nullable(),
});

/**
 * Version nullable du schema image (pour permettre la suppression)
 */
export const nullableImageMediaSchema = imageMediaSchema.nullable();

type BaseMedia = z.infer<typeof baseMediaSchema>;
type ImageMedia = z.infer<typeof imageMediaSchema>;
