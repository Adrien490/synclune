import { z } from "zod";
import { Prisma } from "@/app/generated/prisma";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import {
	GET_ORDERS_SELECT,
	GET_ORDERS_DEFAULT_PER_PAGE,
	GET_ORDERS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
	SORT_LABELS,
	GET_ORDERS_SORT_FIELDS,
} from "../constants/order.constants";
import {
	getOrdersSchema,
	orderFiltersSchema,
	orderSortBySchema,
} from "../schemas/order.schemas";
import type {
	GetOrdersParams,
	GetOrdersReturn,
	Order,
} from "../types/order.types";
import { buildOrderWhereClause } from "../utils/order-query-builder";

// Re-export pour compatibilité
export {
	GET_ORDERS_SELECT,
	GET_ORDERS_DEFAULT_PER_PAGE,
	GET_ORDERS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
	SORT_LABELS,
	GET_ORDERS_SORT_FIELDS,
} from "../constants/order.constants";
export {
	getOrdersSchema,
	orderFiltersSchema,
	orderSortBySchema,
} from "../schemas/order.schemas";
export type {
	GetOrdersParams,
	GetOrdersReturn,
	OrderFilters,
	Order,
} from "../types/order.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les commandes (admin)
 */
export async function getOrders(
	params: GetOrdersParams
): Promise<GetOrdersReturn> {
	try {
		const validation = getOrdersSchema.safeParse(params);

		if (!validation.success) {
			throw new Error(
				"Invalid parameters: " + JSON.stringify(validation.error.issues)
			);
		}

		return await fetchOrders(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}

/**
 * Récupère les commandes depuis la DB avec cache
 */
export async function fetchOrders(
	params: GetOrdersParams
): Promise<GetOrdersReturn> {
	"use cache";
	cacheDashboard(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);

	try {
		const where = buildOrderWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.OrderOrderByWithRelationInput[] =
			params.sortBy.startsWith("created-")
				? [{ createdAt: direction }, { id: "asc" }]
				: params.sortBy.startsWith("total-")
					? [{ total: direction }, { id: "asc" }]
					: params.sortBy.startsWith("status-")
						? [{ status: direction }, { id: "asc" }]
						: params.sortBy.startsWith("paymentStatus-")
							? [{ paymentStatus: direction }, { id: "asc" }]
							: params.sortBy.startsWith("fulfillmentStatus-")
								? [{ fulfillmentStatus: direction }, { id: "asc" }]
								: [{ createdAt: "desc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_ORDERS_DEFAULT_PER_PAGE),
			GET_ORDERS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const orders = await prisma.order.findMany({
			where,
			select: GET_ORDERS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			orders,
			take,
			params.direction,
			params.cursor
		);

		return {
			orders: items,
			pagination,
		};
	} catch (error) {
		const baseReturn = {
			orders: [],
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
					: "Failed to fetch orders",
		};

		return baseReturn as GetOrdersReturn & { error: string };
	}
}
