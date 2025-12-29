import { z } from "zod"
import { TEXT_LIMITS, ARRAY_LIMITS } from "@/shared/constants/validation-limits"

/**
 * Schema pour accepter soit une string, soit un array de strings
 * Utilisé couramment dans les filtres de recherche (ex: collectionId, type, color)
 */
export const stringOrStringArraySchema = z.union([
	z.string().min(1).max(TEXT_LIMITS.FILTER_STRING.max),
	z.array(z.string().min(1).max(TEXT_LIMITS.FILTER_STRING.max)).max(ARRAY_LIMITS.FILTER_ITEMS),
])

/**
 * Version optionnelle du schema stringOrStringArray
 * Pour les champs de filtres qui peuvent être absents
 */
export const optionalStringOrStringArraySchema = stringOrStringArraySchema.optional()

export type StringOrStringArray = z.infer<typeof stringOrStringArraySchema>
