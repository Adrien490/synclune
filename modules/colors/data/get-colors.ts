import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";
import { z } from "zod";

import { cacheColors } from "../constants/cache";

import {
	GET_COLORS_DEFAULT_PER_PAGE,
	GET_COLORS_MAX_RESULTS_PER_PAGE,
	GET_COLORS_SELECT,
} from "../constants/color.constants";
import { getColorsSchema } from "../schemas/color.schemas";
import type {
	GetColorsParams,
	GetColorsParamsInput,
	GetColorsReturn,
} from "../types/color.types";
import { buildColorWhereClause } from "../utils/color-query-builder";

// Re-export pour compatibilité
export {
	COLORS_SORT_LABELS,
	COLORS_SORT_OPTIONS,
	GET_COLORS_DEFAULT_PER_PAGE,
	GET_COLORS_SORT_FIELDS,
} from "../constants/color.constants";
export { colorFiltersSchema, colorSortBySchema } from "../schemas/color.schemas";
export type {
	Color,
	ColorFilters,
	GetColorsParams,
	GetColorsParamsInput,
	GetColorsReturn,
} from "../types/color.types";

// Aliases pour compatibilité
export { COLORS_SORT_LABELS as SORT_LABELS } from "../constants/color.constants";
export { COLORS_SORT_OPTIONS as SORT_OPTIONS } from "../constants/color.constants";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des couleurs avec pagination
 */
export async function getColors(
	params: GetColorsParamsInput
): Promise<GetColorsReturn> {
	try {
		const validation = getColorsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters: " + JSON.stringify(validation.error.issues));
		}

		return fetchColors(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}
		throw error;
	}
}

/**
 * Récupère les couleurs depuis la DB avec cache
 */
async function fetchColors(params: GetColorsParams): Promise<GetColorsReturn> {
	"use cache";
	cacheColors();

	try {
		const where = buildColorWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.ColorOrderByWithRelationInput[] =
			params.sortBy.startsWith("name-")
				? [{ name: direction }, { id: "asc" }]
				: params.sortBy.startsWith("skuCount-")
					? [{ skus: { _count: direction } }, { id: "asc" }]
					: [{ name: "asc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_COLORS_DEFAULT_PER_PAGE),
			GET_COLORS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const colors = await prisma.color.findMany({
			where,
			select: GET_COLORS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			colors,
			take,
			params.direction,
			params.cursor
		);

		return { colors: items, pagination };
	} catch (error) {
		const baseReturn = {
			colors: [],
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
					: "Failed to fetch colors",
		};

		return baseReturn as GetColorsReturn & { error: string };
	}
}
