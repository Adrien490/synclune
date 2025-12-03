import { CollectionStatus } from "@/app/generated/prisma";
import { z } from "zod";
import {
	GET_COLLECTIONS_DEFAULT_PER_PAGE,
	GET_COLLECTIONS_DEFAULT_SORT_BY,
	GET_COLLECTIONS_MAX_RESULTS_PER_PAGE,
	GET_COLLECTIONS_SORT_FIELDS,
} from "../constants/collection.constants";

// ============================================================================
// STATUS SCHEMA
// ============================================================================

export const collectionStatusSchema = z
	.enum([CollectionStatus.PUBLIC, CollectionStatus.DRAFT, CollectionStatus.ARCHIVED])
	.optional()
	.default(CollectionStatus.DRAFT);

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const collectionFiltersSchema = z.object({
	hasProducts: z
		.union([z.boolean(), z.enum(["true", "false"])])
		.optional()
		.transform((val) => {
			if (typeof val === "boolean") return val;
			if (val === "true") return true;
			if (val === "false") return false;
			return undefined;
		}),
	status: z
		.union([z.nativeEnum(CollectionStatus), z.array(z.nativeEnum(CollectionStatus))])
		.optional(),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const collectionSortBySchema = z.preprocess((value) => {
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
	cursor: z.string().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int()
		.min(1)
		.max(GET_COLLECTIONS_MAX_RESULTS_PER_PAGE)
		.default(GET_COLLECTIONS_DEFAULT_PER_PAGE),
	sortBy: collectionSortBySchema.default(GET_COLLECTIONS_DEFAULT_SORT_BY),
	search: z.string().max(200).optional(),
	filters: collectionFiltersSchema.optional(),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const collectionNameSchema = z
	.string()
	.trim()
	.min(1, "Le nom est requis")
	.max(100, "Le nom ne peut pas depasser 100 caracteres");

export const collectionDescriptionSchema = z
	.string()
	.trim()
	.max(1000, "La description ne peut pas depasser 1000 caracteres")
	.optional()
	.nullable();

export const collectionSlugSchema = z
	.string()
	.trim()
	.min(1, "Le slug est requis")
	.max(100, "Le slug ne peut pas depasser 100 caracteres")
	.regex(
		/^[a-z0-9-]+$/,
		"Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"
	);

export const createCollectionSchema = z.object({
	name: collectionNameSchema,
	description: collectionDescriptionSchema,
	status: collectionStatusSchema,
});

export const updateCollectionSchema = z.object({
	id: z.string().cuid("ID invalide"),
	name: collectionNameSchema,
	slug: collectionSlugSchema,
	description: collectionDescriptionSchema,
	status: z.nativeEnum(CollectionStatus),
});

export const updateCollectionStatusSchema = z.object({
	id: z.string().cuid("ID invalide"),
	status: z.nativeEnum(CollectionStatus),
});

export const deleteCollectionSchema = z.object({
	id: z.string().cuid("ID invalide"),
});

export const bulkDeleteCollectionsSchema = z.object({
	ids: z
		.array(z.string().cuid2({ message: "ID de collection invalide" }))
		.min(1, "Au moins une collection doit être sélectionnée"),
});

export const bulkArchiveCollectionsSchema = z.object({
	collectionIds: z
		.array(z.string().cuid2({ message: "ID de collection invalide" }))
		.min(1, "Au moins une collection doit être sélectionnée"),
	targetStatus: z.enum([CollectionStatus.ARCHIVED, CollectionStatus.PUBLIC, CollectionStatus.DRAFT]),
});
