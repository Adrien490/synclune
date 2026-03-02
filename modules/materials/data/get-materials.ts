import { type Prisma } from "@/app/generated/prisma/client";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import { cacheMaterials } from "../constants/cache";

import {
	GET_MATERIALS_DEFAULT_PER_PAGE,
	GET_MATERIALS_MAX_RESULTS_PER_PAGE,
	GET_MATERIALS_SELECT,
} from "../constants/materials.constants";
import { getMaterialsSchema } from "../schemas/materials.schemas";
import type {
	GetMaterialsParams,
	GetMaterialsParamsInput,
	GetMaterialsReturn,
} from "../types/materials.types";
import { buildMaterialWhereClause } from "../services/materials-query-builder";

// Re-export pour compatibilité
export {
	MATERIALS_SORT_LABELS,
	MATERIALS_SORT_OPTIONS,
	GET_MATERIALS_DEFAULT_PER_PAGE,
	GET_MATERIALS_SORT_FIELDS,
} from "../constants/materials.constants";
export { materialFiltersSchema, materialSortBySchema } from "../schemas/materials.schemas";
export type {
	Material,
	MaterialFilters,
	GetMaterialsParams,
	GetMaterialsParamsInput,
	GetMaterialsReturn,
} from "../types/materials.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des matériaux avec pagination
 */
export async function getMaterials(params: GetMaterialsParamsInput): Promise<GetMaterialsReturn> {
	const validation = getMaterialsSchema.safeParse(params);

	if (!validation.success) {
		return {
			materials: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}

	return fetchMaterials(validation.data);
}

/**
 * Récupère les matériaux depuis la DB avec cache
 */
async function fetchMaterials(params: GetMaterialsParams): Promise<GetMaterialsReturn> {
	"use cache";
	cacheMaterials();

	try {
		const where = buildMaterialWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.MaterialOrderByWithRelationInput[] = params.sortBy.startsWith("name-")
			? [{ name: direction }, { id: "asc" }]
			: params.sortBy.startsWith("skuCount-")
				? [{ skus: { _count: direction } }, { id: "asc" }]
				: params.sortBy.startsWith("createdAt-")
					? [{ createdAt: direction }, { id: "asc" }]
					: [{ name: "asc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_MATERIALS_DEFAULT_PER_PAGE),
			GET_MATERIALS_MAX_RESULTS_PER_PAGE,
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const materials = await prisma.material.findMany({
			where,
			select: GET_MATERIALS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			materials,
			take,
			params.direction,
			params.cursor,
		);

		return { materials: items, pagination };
	} catch {
		return {
			materials: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}
}
