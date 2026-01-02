import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_COLLECTION_SELECT,
	GET_COLLECTIONS_SELECT,
} from "../constants/collection.constants";
import {
	collectionFiltersSchema,
	getCollectionSchema,
	getCollectionsSchema,
	createCollectionSchema,
	updateCollectionSchema,
	deleteCollectionSchema,
	bulkDeleteCollectionsSchema,
	updateCollectionStatusSchema,
} from "../schemas/collection.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type CollectionFilters = z.infer<typeof collectionFiltersSchema>;

// ============================================================================
// FUNCTION TYPES - SINGLE
// ============================================================================

export type GetCollectionParams = z.infer<typeof getCollectionSchema>;

export type GetCollectionReturn = Prisma.CollectionGetPayload<{
	select: typeof GET_COLLECTION_SELECT;
}>;

// ============================================================================
// FUNCTION TYPES - LIST
// ============================================================================

export type GetCollectionsParams = Omit<
	z.infer<typeof getCollectionsSchema>,
	"direction"
> & {
	direction?: "forward" | "backward";
};

export type GetCollectionsReturn = {
	collections: Array<
		Prisma.CollectionGetPayload<{ select: typeof GET_COLLECTIONS_SELECT }>
	>;
	pagination: PaginationInfo;
};

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type Collection = Prisma.CollectionGetPayload<{
	select: typeof GET_COLLECTIONS_SELECT;
}>;

/** Type simplifié pour les selects/dropdowns */
export type CollectionOption = {
	id: string;
	name: string;
};

/** Type minimal pour les formulaires d'édition */
export type CollectionFormData = Pick<Collection, "id" | "name" | "slug" | "description">;

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type DeleteCollectionInput = z.infer<typeof deleteCollectionSchema>;
export type BulkDeleteCollectionsInput = z.infer<typeof bulkDeleteCollectionsSchema>;
export type UpdateCollectionStatusInput = z.infer<typeof updateCollectionStatusSchema>;

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

/** Image pour les cards et grilles de collection */
export interface CollectionImage {
	url: string;
	blurDataUrl?: string | null;
	alt?: string | null;
}
