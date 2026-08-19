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
	hasProducts: z.boolean().optional(),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

const productTypeSortBySchema = z.preprocess((value) => {
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
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

const productTypeLabelSchema = z
	.string()
	.trim()
	.min(1, "Le label est requis")
	.max(50, "Le label ne peut pas dépasser 50 caractères");

// `productTypeSlugSchema` supprimé : aucun consommateur hors de son propre test
// (vert pour rien), et son max(50) contredisait `ProductType.slug @db.VarChar(100)`.
// Le slug est GÉNÉRÉ côté serveur (generateSlug), jamais saisi.

export const createProductTypeSchema = z.object({
	label: productTypeLabelSchema,
});

export const updateProductTypeSchema = z.object({
	id: z.cuid2("ID invalide"),
	label: productTypeLabelSchema,
});

export const deleteProductTypeSchema = z.object({
	productTypeId: z.cuid2(),
});

export const duplicateProductTypeSchema = z.object({
	productTypeId: z.cuid2("ID de type de bijou invalide"),
});
