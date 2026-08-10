import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { PublicationStatus } from "@/app/generated/prisma/client";
import { z } from "zod";
import { formBooleanSchema } from "@/shared/schemas/boolean.schema";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_COLLECTIONS_DEFAULT_PER_PAGE,
	GET_COLLECTIONS_DEFAULT_SORT_BY,
	GET_COLLECTIONS_MAX_RESULTS_PER_PAGE,
	GET_COLLECTIONS_SORT_FIELDS,
} from "../constants/collection.constants";

// ============================================================================
// STATUS SCHEMA
// ============================================================================

const collectionStatusSchema = z
	.enum([PublicationStatus.PUBLIC, PublicationStatus.DRAFT, PublicationStatus.ARCHIVED])
	.optional()
	.default(PublicationStatus.DRAFT);

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const collectionFiltersSchema = z.object({
	// SSOT `formBooleanSchema` (cf. order.schemas.ts) — même ré-implémentation,
	// même sur-ensemble de valeurs acceptées.
	hasProducts: formBooleanSchema.optional(),
	status: z.union([z.enum(PublicationStatus), z.array(z.enum(PublicationStatus))]).optional(),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

const collectionSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_COLLECTIONS_SORT_FIELDS.includes(value as (typeof GET_COLLECTIONS_SORT_FIELDS)[number])
		? value
		: GET_COLLECTIONS_DEFAULT_SORT_BY;
}, z.enum(GET_COLLECTIONS_SORT_FIELDS));

// ============================================================================
// SINGLE COLLECTION SCHEMA
// ============================================================================

export const getCollectionSchema = z.object({
	slug: z.string().trim().min(1),
});

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getCollectionsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(
		GET_COLLECTIONS_DEFAULT_PER_PAGE,
		GET_COLLECTIONS_MAX_RESULTS_PER_PAGE,
	),
	sortBy: collectionSortBySchema.default(GET_COLLECTIONS_DEFAULT_SORT_BY),
	search: z.string().max(TEXT_LIMITS.SEARCH.max).optional(),
	filters: collectionFiltersSchema.optional(),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

const collectionNameSchema = z
	.string()
	.trim()
	.min(1, "Le nom est requis")
	.max(100, "Le nom ne peut pas dépasser 100 caractères");

const collectionDescriptionSchema = z
	.string()
	.trim()
	.max(1000, "La description ne peut pas dépasser 1000 caractères")
	.optional()
	.nullable();

export const createCollectionSchema = z.object({
	name: collectionNameSchema,
	description: collectionDescriptionSchema,
	status: collectionStatusSchema,
});

export const updateCollectionSchema = z.object({
	id: z.cuid2("ID invalide"),
	name: collectionNameSchema,
	description: collectionDescriptionSchema,
	status: z.enum(PublicationStatus),
});

export const updateCollectionStatusSchema = z.object({
	id: z.cuid2("ID invalide"),
	status: z.enum(PublicationStatus),
});

export const deleteCollectionSchema = z.object({
	id: z.cuid2("ID invalide"),
});

export const setFeaturedProductSchema = z.object({
	collectionId: z.cuid2("ID de collection invalide"),
	productId: z.cuid2("ID de produit invalide"),
});
