import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { z } from "zod";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_PRODUCT_TYPES_DEFAULT_PER_PAGE,
	GET_PRODUCT_TYPES_DEFAULT_SORT_BY,
	GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE,
	GET_PRODUCT_TYPES_SORT_FIELDS,
} from "../constants/product-type.constants";

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const productTypeFiltersSchema = z.object({
	isActive: z.boolean().optional(),
	isSystem: z.boolean().optional(),
	hasProducts: z.boolean().optional(),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const productTypeSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_PRODUCT_TYPES_SORT_FIELDS.includes(value as (typeof GET_PRODUCT_TYPES_SORT_FIELDS)[number])
		? value
		: GET_PRODUCT_TYPES_DEFAULT_SORT_BY;
}, z.enum(GET_PRODUCT_TYPES_SORT_FIELDS));

// ============================================================================
// MAIN SCHEMAS
// ============================================================================

export const getProductTypesSchema = z.object({
	search: z.string().trim().max(TEXT_LIMITS.SEARCH.max).optional(),
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(
		GET_PRODUCT_TYPES_DEFAULT_PER_PAGE,
		GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE,
	),
	sortBy: productTypeSortBySchema.default(GET_PRODUCT_TYPES_DEFAULT_SORT_BY),
	filters: productTypeFiltersSchema.optional(),
});

export const getProductTypeSchema = z.object({
	slug: z.string().trim().min(1),
	includeInactive: z.boolean().optional(),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const productTypeLabelSchema = z
	.string()
	.trim()
	.min(1, "Le label est requis")
	.max(50, "Le label ne peut pas dépasser 50 caractères");

export const productTypeDescriptionSchema = z
	.string()
	.trim()
	.max(500, "La description ne peut pas dépasser 500 caractères")
	.optional();

// `productTypeSlugSchema` supprimé : aucun consommateur hors de son propre test
// (vert pour rien), et son max(50) contredisait `ProductType.slug @db.VarChar(100)`.
// Le slug est GÉNÉRÉ côté serveur (generateSlug), jamais saisi.

export const createProductTypeSchema = z.object({
	label: productTypeLabelSchema,
	description: productTypeDescriptionSchema,
});

export const updateProductTypeSchema = z.object({
	id: z.cuid2("ID invalide"),
	label: productTypeLabelSchema,
	description: productTypeDescriptionSchema,
});

export const deleteProductTypeSchema = z.object({
	productTypeId: z.cuid2(),
});

export const toggleProductTypeStatusSchema = z.object({
	productTypeId: z.cuid2("ID de type de produit invalide"),
	isActive: z.boolean(),
});

export const duplicateProductTypeSchema = z.object({
	productTypeId: z.cuid2("ID de type de produit invalide"),
});
