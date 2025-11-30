import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import {
	GET_REFUNDS_DEFAULT_PER_PAGE,
	GET_REFUNDS_MAX_RESULTS_PER_PAGE,
	GET_REFUNDS_SELECT,
	SORT_OPTIONS,
	SORT_LABELS,
} from "../constants/refund.constants";
import { getRefundsSchema, refundFiltersSchema, refundSortBySchema } from "../schemas/refund.schemas";
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
// QUERY BUILDER
// ============================================================================

function buildRefundWhereClause(
	params: GetRefundsParams
): Prisma.RefundWhereInput {
	const where: Prisma.RefundWhereInput = {
		// Soft delete: exclure les remboursements supprimés par défaut
		deletedAt: null,
	};
	const AND: Prisma.RefundWhereInput[] = [];

	// Recherche textuelle (orderNumber, customerEmail, customerName)
	if (params.search) {
		AND.push({
			OR: [
				{
					order: {
						orderNumber: { contains: params.search, mode: "insensitive" },
					},
				},
				{
					order: {
						customerEmail: { contains: params.search, mode: "insensitive" },
					},
				},
				{
					order: {
						customerName: { contains: params.search, mode: "insensitive" },
					},
				},
			],
		});
	}

	// Filtre par statut
	if (params.filters?.status) {
		if (Array.isArray(params.filters.status)) {
			AND.push({ status: { in: params.filters.status } });
		} else {
			AND.push({ status: params.filters.status });
		}
	}

	// Filtre par raison
	if (params.filters?.reason) {
		if (Array.isArray(params.filters.reason)) {
			AND.push({ reason: { in: params.filters.reason } });
		} else {
			AND.push({ reason: params.filters.reason });
		}
	}

	// Filtre par commande
	if (params.filters?.orderId) {
		AND.push({ orderId: params.filters.orderId });
	}

	// Filtre par date
	if (params.filters?.createdAfter) {
		AND.push({ createdAt: { gte: params.filters.createdAfter } });
	}
	if (params.filters?.createdBefore) {
		AND.push({ createdAt: { lte: params.filters.createdBefore } });
	}

	if (AND.length > 0) {
		where.AND = AND;
	}

	return where;
}

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
