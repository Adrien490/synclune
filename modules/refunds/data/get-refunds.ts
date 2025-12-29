import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";
import { cacheLife, cacheTag } from "next/cache";
import { ORDERS_CACHE_TAGS } from "../constants/cache";

import {
	GET_REFUNDS_DEFAULT_PER_PAGE,
	GET_REFUNDS_MAX_RESULTS_PER_PAGE,
	GET_REFUNDS_SELECT,
	SORT_OPTIONS,
	SORT_LABELS,
} from "../constants/refund.constants";
import { getRefundsSchema, refundFiltersSchema, refundSortBySchema } from "../schemas/refund.schemas";
import { buildRefundWhereClause } from "../services/refund-query-builder";
import type { GetRefundsParams, GetRefundsReturn } from "../types/refund.types";

// Re-export pour compatibilité
export {
	SORT_LABELS,
	SORT_OPTIONS,
	GET_REFUNDS_DEFAULT_PER_PAGE,
} from "../constants/refund.constants";
export { refundFiltersSchema, refundSortBySchema } from "../schemas/refund.schemas";
export type {
	Refund,
	RefundFilters,
	GetRefundsParams,
	GetRefundsReturn,
} from "../types/refund.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des remboursements avec pagination
 */
export async function getRefunds(
	params: GetRefundsParams
): Promise<GetRefundsReturn> {
	try {
		const validation = getRefundsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters: " + JSON.stringify(validation.error.issues));
		}

		return fetchRefunds(validation.data);
	} catch (error) {
		throw error;
	}
}

/**
 * Récupère les refunds depuis la DB
 */
async function fetchRefunds(
	params: GetRefundsParams
): Promise<GetRefundsReturn> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	try {
		const where = buildRefundWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.RefundOrderByWithRelationInput[] =
			params.sortBy.startsWith("amount-")
				? [{ amount: direction }, { id: "asc" }]
				: params.sortBy.startsWith("status-")
					? [{ status: direction }, { id: "asc" }]
					: [{ createdAt: direction }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_REFUNDS_DEFAULT_PER_PAGE),
			GET_REFUNDS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const refunds = await prisma.refund.findMany({
			where,
			select: GET_REFUNDS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			refunds,
			take,
			params.direction,
			params.cursor
		);

		return { refunds: items, pagination };
	} catch (error) {
		const baseReturn = {
			refunds: [],
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
					: "Failed to fetch refunds",
		};

		return baseReturn as GetRefundsReturn & { error: string };
	}
}
