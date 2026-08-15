import { z } from "zod";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	COLOR_SEARCH_MAX_LENGTH,
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

const colorSortBySchema = z.enum(GET_COLORS_SORT_FIELDS).default(GET_COLORS_DEFAULT_SORT_BY);

// ============================================================================
// MAIN SCHEMAS
// ============================================================================

export const getColorsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_COLORS_DEFAULT_PER_PAGE, GET_COLORS_MAX_RESULTS_PER_PAGE),
	sortBy: colorSortBySchema.optional().default(GET_COLORS_DEFAULT_SORT_BY),
	search: z.string().max(COLOR_SEARCH_MAX_LENGTH).optional(),
	filters: colorFiltersSchema.optional().default({}),
});

export const getColorSchema = z.object({
	id: z.string().trim().min(1),
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
				code: "custom",
				message: "Format invalide. Utilisez #RRGGBB (ex: #FF5733) ou #RGB (ex: #F57)",
			});
		}
	})
	.transform((val) => normalizeHex(val));

export const colorNameSchema = z
	.string()
	.trim()
	.min(1, "Le nom est requis")
	.max(100, "Le nom ne peut pas dépasser 100 caractères");

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

export const duplicateColorSchema = z.object({
	colorId: z.cuid2("ID de couleur invalide"),
});
