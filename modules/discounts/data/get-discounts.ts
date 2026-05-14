import { type Prisma } from "@/app/generated/prisma/client";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";
import { logger } from "@/shared/lib/logger";

import { cacheDiscounts } from "../constants/cache";

import {
	GET_DISCOUNTS_DEFAULT_PER_PAGE,
	GET_DISCOUNTS_MAX_RESULTS_PER_PAGE,
	GET_DISCOUNTS_SELECT,
} from "../constants/discount.constants";
import { getDiscountsSchema } from "../schemas/discount.schemas";
import { buildDiscountWhereClause } from "../services/discount-query-builder";
import type { GetDiscountsParams, GetDiscountsReturn } from "../types/discount.types";

export { GET_DISCOUNTS_DEFAULT_PER_PAGE } from "../constants/discount.constants";
export type { GetDiscountsReturn } from "../types/discount.types";

export { DISCOUNTS_SORT_LABELS as SORT_LABELS } from "../constants/discount.constants";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

const EMPTY_RESULT: GetDiscountsReturn = {
	discounts: [],
	pagination: {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	},
	totalCount: 0,
};

/**
 * Récupère la liste des codes promo avec pagination
 */
export async function getDiscounts(params: GetDiscountsParams): Promise<GetDiscountsReturn> {
	const validation = getDiscountsSchema.safeParse(params);

	if (!validation.success) {
		logger.error(
			"[get-discounts] Invalid params",
			new Error(JSON.stringify(validation.error.issues)),
		);
		return EMPTY_RESULT;
	}

	return fetchDiscounts(validation.data);
}

/**
 * Récupère les discounts depuis la DB avec cache
 */
async function fetchDiscounts(params: GetDiscountsParams): Promise<GetDiscountsReturn> {
	"use cache";
	cacheDiscounts();

	try {
		const where = buildDiscountWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.DiscountOrderByWithRelationInput[] = params.sortBy.startsWith("code-")
			? [{ code: direction }, { id: "asc" }]
			: params.sortBy.startsWith("created-")
				? [{ createdAt: direction }, { id: "asc" }]
				: params.sortBy.startsWith("usage-")
					? [{ usageCount: direction }, { id: "asc" }]
					: [{ createdAt: "desc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_DISCOUNTS_DEFAULT_PER_PAGE),
			GET_DISCOUNTS_MAX_RESULTS_PER_PAGE,
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const [discounts, totalCount] = await Promise.all([
			prisma.discount.findMany({
				where,
				select: GET_DISCOUNTS_SELECT,
				orderBy,
				...cursorConfig,
			}),
			prisma.discount.count({ where }),
		]);

		const { items, pagination } = processCursorResults(
			discounts,
			take,
			params.direction,
			params.cursor,
		);

		return { discounts: items, pagination, totalCount };
	} catch (error) {
		if (error instanceof Error) {
			logger.error("[get-discounts] Failed to fetch discounts", error);
		}

		return EMPTY_RESULT;
	}
}
