import { z } from "zod"
import { isAllowedMediaDomain } from "@/shared/lib/media-validation"

/**
 * Schema de base pour un media (image ou video)
 * Contient les champs communs a tous les types de medias
 */
export const baseMediaSchema = z.object({
	url: z
		.string()
		.url({ message: "L'URL du media doit etre valide" })
		.refine(isAllowedMediaDomain, {
			message: "L'URL du media doit provenir d'un domaine autorise",
		}),
	blurDataUrl: z.string().optional().nullable(),
	altText: z.string().max(255).optional().nullable(),
})

/**
 * Schema complet pour un media avec miniature et type
 * Utilise pour les images/videos de produits et SKUs
 */
export const imageMediaSchema = baseMediaSchema.extend({
	thumbnailUrl: z
		.string()
		.url()
		.refine((url) => !url || isAllowedMediaDomain(url), {
			message: "L'URL de la miniature doit provenir d'un domaine autorise",
		})
		.optional()
		.nullable(),
	mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
})

/**
 * Version nullable du schema image (pour permettre la suppression)
 */
export const nullableImageMediaSchema = imageMediaSchema.nullable()

export type BaseMedia = z.infer<typeof baseMediaSchema>
export type ImageMedia = z.infer<typeof imageMediaSchema>
