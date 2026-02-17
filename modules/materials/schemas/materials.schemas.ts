import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
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

export const materialFiltersSchema = z.object({
	isActive: z.boolean().optional(),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const materialSortBySchema = z
	.enum(GET_MATERIALS_SORT_FIELDS)
	.default(GET_MATERIALS_DEFAULT_SORT_BY);

// ============================================================================
// MAIN SCHEMAS
// ============================================================================

export const getMaterialsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_MATERIALS_DEFAULT_PER_PAGE, GET_MATERIALS_MAX_RESULTS_PER_PAGE),
	sortBy: materialSortBySchema.optional().default(GET_MATERIALS_DEFAULT_SORT_BY),
	search: z.string().max(100).optional(),
	filters: materialFiltersSchema.optional().default({}),
});

export const getMaterialSchema = z.object({
	slug: z.string().trim().min(1),
	includeInactive: z.boolean().optional(),
});

// ============================================================================
// FIELD SCHEMAS
// ============================================================================

export const materialSlugSchema = z
	.string()
	.trim()
	.min(1, "Le slug est requis")
	.max(100, "Le slug ne peut pas depasser 100 caracteres")
	.regex(
		/^[a-z0-9-]+$/,
		"Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"
	);

export const materialNameSchema = z
	.string()
	.trim()
	.min(1, "Le nom est requis")
	.max(100, "Le nom ne peut pas depasser 100 caracteres");

export const materialDescriptionSchema = z
	.string()
	.trim()
	.max(1000, "La description ne peut pas depasser 1000 caracteres")
	.optional()
	.nullable();

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createMaterialSchema = z.object({
	name: materialNameSchema,
	description: materialDescriptionSchema,
});

export const updateMaterialSchema = z.object({
	id: z.cuid2("ID invalide"),
	name: materialNameSchema,
	slug: materialSlugSchema,
	description: materialDescriptionSchema,
	isActive: z.boolean().optional(),
});

export const deleteMaterialSchema = z.object({
	id: z.cuid2("ID invalide"),
});

export const bulkDeleteMaterialsSchema = z.object({
	ids: z.array(z.cuid2("ID invalide")).min(1, "Aucun materiau selectionne").max(200, "Maximum 200 materiaux par operation"),
});

export const toggleMaterialStatusSchema = z.object({
	id: z.cuid2("ID invalide"),
	isActive: z.boolean(),
});

export const bulkToggleMaterialStatusSchema = z.object({
	ids: z.array(z.cuid2("ID invalide")).min(1, "Aucun materiau selectionne").max(200, "Maximum 200 materiaux par operation"),
	isActive: z.boolean(),
});

export const duplicateMaterialSchema = z.object({
	materialId: z.cuid2("ID de materiau invalide"),
});
