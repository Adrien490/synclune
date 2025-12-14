import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_COLORS_DEFAULT_PER_PAGE,
	GET_COLORS_DEFAULT_SORT_BY,
	GET_COLORS_MAX_RESULTS_PER_PAGE,
	GET_COLORS_SORT_FIELDS,
} from "../constants/color.constants";
import { normalizeHex } from "../utils/hex-normalizer";

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const colorFiltersSchema = z.object({});

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const colorSortBySchema = z
	.enum(GET_COLORS_SORT_FIELDS)
	.default(GET_COLORS_DEFAULT_SORT_BY);

// ============================================================================
// MAIN SCHEMAS
// ============================================================================

export const getColorsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_COLORS_DEFAULT_PER_PAGE, GET_COLORS_MAX_RESULTS_PER_PAGE),
	sortBy: colorSortBySchema.optional().default(GET_COLORS_DEFAULT_SORT_BY),
	search: z.string().max(100).optional(),
	filters: colorFiltersSchema.optional().default({}),
});

export const getColorSchema = z.object({
	slug: z.string().trim().min(1),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const hexColorSchema = z
	.string()
	.trim()
	.min(1, "Le code couleur est requis")
	.transform((val) => {
		// Retirer le # pour validation
		const cleaned = val.replace(/^#/, "");

		// Verifier le format (3 ou 6 caracteres hex)
		if (!/^[0-9A-Fa-f]{3}$/.test(cleaned) && !/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
			throw new z.ZodError([
				{
					code: "custom",
					path: ["hex"],
					message:
						"Format invalide. Utilisez #RRGGBB (ex: #FF5733) ou #RGB (ex: #F57)",
				},
			]);
		}

		return normalizeHex(val);
	})
	.refine((val) => /^#[0-9A-F]{6}$/.test(val), {
		message: "Le code couleur doit être au format #RRGGBB en majuscules",
	});

export const colorSlugSchema = z
	.string()
	.trim()
	.min(1, "Le slug est requis")
	.max(50, "Le slug ne peut pas depasser 50 caracteres")
	.regex(
		/^[a-z0-9-]+$/,
		"Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"
	);

export const colorNameSchema = z
	.string()
	.trim()
	.min(1, "Le nom est requis")
	.max(50, "Le nom ne peut pas depasser 50 caracteres");

export const createColorSchema = z.object({
	name: colorNameSchema,
	hex: hexColorSchema,
});

export const updateColorSchema = z.object({
	id: z.cuid("ID invalide"),
	name: colorNameSchema,
	slug: colorSlugSchema,
	hex: hexColorSchema,
});

export const deleteColorSchema = z.object({
	id: z.cuid("ID invalide"),
});

export const bulkDeleteColorsSchema = z.object({
	ids: z.array(z.cuid("ID invalide")).min(1, "Aucune couleur sélectionnée"),
});
