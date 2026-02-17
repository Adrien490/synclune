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

export const colorFiltersSchema = z.object({
	isActive: z.boolean().optional(),
});

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
	includeInactive: z.boolean().optional(),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const hexColorSchema = z
	.string()
	.trim()
	.min(1, "Le code couleur est requis")
	.superRefine((val, ctx) => {
		const cleaned = val.replace(/^#/, "");
		if (!/^[0-9A-Fa-f]{3}$/.test(cleaned) && !/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Format invalide. Utilisez #RRGGBB (ex: #FF5733) ou #RGB (ex: #F57)",
			});
		}
	})
	.transform((val) => normalizeHex(val));

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
	.max(100, "Le nom ne peut pas depasser 100 caracteres");

export const createColorSchema = z.object({
	name: colorNameSchema,
	hex: hexColorSchema,
});

export const updateColorSchema = z.object({
	id: z.cuid2("ID invalide"),
	name: colorNameSchema,
	hex: hexColorSchema,
});

export const deleteColorSchema = z.object({
	id: z.cuid2("ID invalide"),
});

export const bulkDeleteColorsSchema = z.object({
	ids: z.array(z.cuid2("ID invalide")).min(1, "Aucune couleur sélectionnée").max(200, "Maximum 200 couleurs par opération"),
});

export const toggleColorStatusSchema = z.object({
	id: z.cuid2("ID invalide"),
	isActive: z.boolean(),
});

export const bulkToggleColorStatusSchema = z.object({
	ids: z.array(z.cuid2("ID invalide")).min(1, "Aucune couleur selectionnee").max(200, "Maximum 200 couleurs par opération"),
	isActive: z.boolean(),
});

export const duplicateColorSchema = z.object({
	colorId: z.cuid2("ID de couleur invalide"),
});
