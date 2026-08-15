import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { z } from "zod";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_MATERIALS_DEFAULT_PER_PAGE,
	GET_MATERIALS_DEFAULT_SORT_BY,
	GET_MATERIALS_MAX_RESULTS_PER_PAGE,
	GET_MATERIALS_SORT_FIELDS,
} from "../constants/materials.constants";

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

const materialFiltersSchema = z.object({});

// ============================================================================
// SORT SCHEMA
// ============================================================================

const materialSortBySchema = z
	.enum(GET_MATERIALS_SORT_FIELDS)
	.default(GET_MATERIALS_DEFAULT_SORT_BY);

// ============================================================================
// FIELD SCHEMAS
// ============================================================================

export const materialNameSchema = z
	.string()
	.trim()
	.min(1, "Le nom est requis")
	.max(100, "Le nom ne peut pas dépasser 100 caractères");

// ============================================================================
// MAIN SCHEMAS
// ============================================================================

export const getMaterialsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_MATERIALS_DEFAULT_PER_PAGE, GET_MATERIALS_MAX_RESULTS_PER_PAGE),
	sortBy: materialSortBySchema.optional().default(GET_MATERIALS_DEFAULT_SORT_BY),
	search: z.string().max(TEXT_LIMITS.SEARCH.max).optional(),
	filters: materialFiltersSchema.optional().default({}),
});

export const getMaterialSchema = z.object({
	id: z.string().trim().min(1),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createMaterialSchema = z.object({
	name: materialNameSchema,
});

export const updateMaterialSchema = z.object({
	id: z.cuid2("ID invalide"),
	name: materialNameSchema,
});

export const deleteMaterialSchema = z.object({
	id: z.cuid2("ID invalide"),
});

export const duplicateMaterialSchema = z.object({
	materialId: z.cuid2("ID de matériau invalide"),
});
