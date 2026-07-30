import { z } from "zod";
import { TEXT_LIMITS, ARRAY_LIMITS } from "@/shared/constants/validation-limits";

/**
 * Reordonnancement des medias d'un SKU (drag-and-drop admin)
 * Prend un skuId + la liste ordonnee des mediaIds.
 * La position 0 sera attribuee au premier element du tableau.
 */
export const reorderSkuMediaSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
	mediaIds: z
		.array(z.cuid2({ message: "ID media invalide" }))
		.min(1, { message: "Au moins un media est requis" })
		.max(ARRAY_LIMITS.SKU_GALLERY_MEDIA + 1, {
			message: `Maximum ${ARRAY_LIMITS.SKU_GALLERY_MEDIA + 1} médias par variante`,
		})
		// Unicité : l'action vérifie « autant d'ids que de médias » ET « chaque id
		// appartient au SKU », mais `["a","a"]` sur un SKU de 2 médias satisfait les
		// DEUX — le média « b » gardait alors sa position périmée, et l'ordre final
		// n'était plus une permutation. Le doublon doit être rejeté en entrée.
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "La liste de médias contient un doublon",
		}),
});

/**
 * Definition du media principal d'un SKU (isPrimary=true)
 * Un seul media primary par SKU (contrainte metier).
 */
export const setPrimarySkuMediaSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
	mediaId: z.cuid2({ message: "ID media invalide" }),
});

/**
 * Mise a jour chirurgicale du texte alternatif d'un media (WCAG)
 */
export const updateSkuMediaAltTextSchema = z.object({
	mediaId: z.cuid2({ message: "ID media invalide" }),
	altText: z
		.string()
		.trim()
		.max(TEXT_LIMITS.MEDIA_ALT_TEXT.max, {
			message: `Le texte alternatif ne peut pas dépasser ${TEXT_LIMITS.MEDIA_ALT_TEXT.max} caracteres`,
		})
		.optional()
		.or(z.literal(""))
		.transform((val) => (val === "" || val === undefined ? null : val)),
});

/**
 * Restauration d'un SKU soft-deleted
 */
