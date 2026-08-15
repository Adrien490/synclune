import { type Prisma } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import { cacheColors } from "../constants/cache";

import {
	GET_COLORS_DEFAULT_PER_PAGE,
	GET_COLORS_MAX_RESULTS_PER_PAGE,
	GET_COLORS_SELECT,
} from "../constants/color.constants";
import { getColorsSchema } from "../schemas/color.schemas";
import type { GetColorsParams, GetColorsParamsInput, GetColorsReturn } from "../types/color.types";
import { buildColorWhereClause } from "../services/color-query-builder";

// Re-export pour compatibilité
export type { GetColorsReturn } from "../types/color.types";

// Aliases pour compatibilité
export { COLORS_SORT_LABELS as SORT_LABELS } from "../constants/color.constants";
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des couleurs avec pagination
 */
export async function getColors(params: GetColorsParamsInput): Promise<GetColorsReturn> {
	const validation = getColorsSchema.safeParse(params);

	if (!validation.success) {
		return {
			colors: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
		};
	}

	return fetchColors(validation.data);
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

		const orderBy: Prisma.ColorOrderByWithRelationInput[] = params.sortBy.startsWith("name-")
			? [{ name: direction }, { id: "asc" }]
			: params.sortBy.startsWith("variantCount-")
				? [{ variants: { _count: direction } }, { id: "asc" }]
				: [{ name: "asc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_COLORS_DEFAULT_PER_PAGE),
			GET_COLORS_MAX_RESULTS_PER_PAGE,
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const [colors, totalCount] = await Promise.all([
			prisma.color.findMany({
				where,
				select: GET_COLORS_SELECT,
				orderBy,
				...cursorConfig,
			}),
			prisma.color.count({ where }),
		]);

		const { items, pagination } = processCursorResults(
			colors,
			take,
			params.direction,
			params.cursor,
		);

		return { colors: items, pagination, totalCount };
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "colors", operation: "fetchColors" },
		});

		return {
			colors: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
		};
	}
}
