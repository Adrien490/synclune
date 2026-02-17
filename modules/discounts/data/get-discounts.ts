import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";
import { z } from "zod";

import { cacheDiscounts } from "../constants/cache";

import {
	GET_DISCOUNTS_DEFAULT_PER_PAGE,
	GET_DISCOUNTS_MAX_RESULTS_PER_PAGE,
	GET_DISCOUNTS_SELECT,
	DISCOUNTS_SORT_OPTIONS,
	DISCOUNTS_SORT_LABELS,
} from "../constants/discount.constants";
import { getDiscountsSchema, discountFiltersSchema, discountSortBySchema } from "../schemas/discount.schemas";
import { buildDiscountWhereClause } from "../services/discount-query-builder";
import type { GetDiscountsParams, GetDiscountsReturn } from "../types/discount.types";

// Re-export pour compatibilité
export {
	DISCOUNTS_SORT_LABELS,
	DISCOUNTS_SORT_OPTIONS,
	GET_DISCOUNTS_DEFAULT_PER_PAGE,
} from "../constants/discount.constants";
export { discountFiltersSchema, discountSortBySchema } from "../schemas/discount.schemas";
export type {
	Discount,
	DiscountFilters,
	GetDiscountsParams,
	GetDiscountsReturn,
} from "../types/discount.types";

// Aliases pour compatibilité
export { DISCOUNTS_SORT_LABELS as SORT_LABELS } from "../constants/discount.constants";
export { DISCOUNTS_SORT_OPTIONS as SORT_OPTIONS } from "../constants/discount.constants";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des codes promo avec pagination
 */
export async function getDiscounts(
	params: GetDiscountsParams
): Promise<GetDiscountsReturn> {
	try {
		const validation = getDiscountsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters: " + JSON.stringify(validation.error.issues));
		}

		return fetchDiscounts(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}
		throw error;
	}
}

/**
 * Récupère les discounts depuis la DB avec cache
 */
async function fetchDiscounts(
	params: GetDiscountsParams
): Promise<GetDiscountsReturn> {
	"use cache";
	cacheDiscounts();

	try {
		const where = buildDiscountWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.DiscountOrderByWithRelationInput[] =
			params.sortBy.startsWith("code-")
				? [{ code: direction }, { id: "asc" }]
				: params.sortBy.startsWith("created-")
					? [{ createdAt: direction }, { id: "asc" }]
					: params.sortBy.startsWith("usage-")
						? [{ usageCount: direction }, { id: "asc" }]
						: [{ createdAt: "desc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_DISCOUNTS_DEFAULT_PER_PAGE),
			GET_DISCOUNTS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const discounts = await prisma.discount.findMany({
			where,
			select: GET_DISCOUNTS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			discounts,
			take,
			params.direction,
			params.cursor
		);

		return { discounts: items, pagination };
	} catch (error) {
		if (error instanceof Error) {
			console.error("[get-discounts]", error.message);
		}

		return {
			discounts: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}
}
