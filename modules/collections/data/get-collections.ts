import { Prisma } from "@/app/generated/prisma";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";
import { z } from "zod";

import { cacheCollections } from "../constants/cache";

import {
	GET_COLLECTIONS_DEFAULT_PER_PAGE,
	GET_COLLECTIONS_MAX_RESULTS_PER_PAGE,
	GET_COLLECTIONS_SELECT,
} from "../constants/collection.constants";
import { getCollectionsSchema } from "../schemas/collection.schemas";
import type { GetCollectionsParams, GetCollectionsReturn } from "../types/collection.types";
import { buildCollectionWhereClause } from "../utils/collection-query-builder";

// Re-export pour compatibilité
export {
	COLLECTIONS_SORT_LABELS,
	COLLECTIONS_SORT_OPTIONS,
	GET_COLLECTIONS_DEFAULT_PER_PAGE,
	GET_COLLECTIONS_SORT_FIELDS,
	COLLECTION_STATUS_LABELS,
	COLLECTION_STATUS_COLORS,
} from "../constants/collection.constants";
export { collectionFiltersSchema, collectionSortBySchema } from "../schemas/collection.schemas";
export type {
	Collection,
	CollectionFilters,
	GetCollectionsParams,
	GetCollectionsReturn,
} from "../types/collection.types";

// Aliases pour compatibilité
export { COLLECTIONS_SORT_LABELS as SORT_LABELS } from "../constants/collection.constants";
export { COLLECTIONS_SORT_OPTIONS as SORT_OPTIONS } from "../constants/collection.constants";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des collections avec pagination
 */
export async function getCollections(
	params: GetCollectionsParams
): Promise<GetCollectionsReturn> {
	try {
		const validation = getCollectionsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters: " + JSON.stringify(validation.error.issues));
		}

		return fetchCollections(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}
		throw error;
	}
}

/**
 * Récupère les collections depuis la DB avec cache
 */
async function fetchCollections(
	params: GetCollectionsParams
): Promise<GetCollectionsReturn> {
	"use cache";
	cacheCollections();

	try {
		const where = buildCollectionWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.CollectionOrderByWithRelationInput[] =
			params.sortBy.startsWith("name-")
				? [{ name: direction }, { id: "asc" }]
				: params.sortBy.startsWith("created-")
					? [{ createdAt: direction }, { id: "asc" }]
					: params.sortBy.startsWith("products-")
						? [{ products: { _count: direction } }, { id: "asc" }]
						: [{ name: "asc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_COLLECTIONS_DEFAULT_PER_PAGE),
			GET_COLLECTIONS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const collections = await prisma.collection.findMany({
			where,
			select: GET_COLLECTIONS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			collections,
			take,
			params.direction,
			params.cursor
		);

		return { collections: items, pagination };
	} catch (error) {
		const baseReturn = {
			collections: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			error:
				process.env.NODE_ENV === "development"
					? error instanceof Error
						? error.message
						: "Unknown error"
					: "Failed to fetch collections",
		};

		return baseReturn as GetCollectionsReturn & { error: string };
	}
}
