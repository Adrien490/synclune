import { getSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { prisma } from "@/shared/lib/prisma";
import { cacheOrdersDashboard } from "../constants/cache";
import { z } from "zod";

import {
	GET_ORDER_ITEMS_DEFAULT_SELECT,
	GET_ORDER_ITEMS_DEFAULT_PER_PAGE,
	GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE,
	GET_ORDER_ITEMS_DEFAULT_SORT_ORDER,
	GET_ORDER_ITEMS_SORT_FIELDS,
} from "../constants/order-items.constants";
import {
	getOrderItemsSchema,
	orderItemFiltersSchema,
	orderItemSortBySchema,
} from "../schemas/order-items.schemas";
import type {
	GetOrderItemsReturn,
	GetOrderItemsParams,
} from "../types/order-items.types";
import { buildOrderItemsWhereClause } from "../utils/order-items-query-builder";

// Re-export pour compatibilité
export {
	GET_ORDER_ITEMS_DEFAULT_SELECT,
	GET_ORDER_ITEMS_DEFAULT_PER_PAGE,
	GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE,
	GET_ORDER_ITEMS_SORT_FIELDS,
} from "../constants/order-items.constants";
export {
	getOrderItemsSchema,
	orderItemFiltersSchema,
	orderItemSortBySchema,
} from "../schemas/order-items.schemas";
export type {
	GetOrderItemsReturn,
	GetOrderItemsParams,
} from "../types/order-items.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les items de commande avec gestion des droits
 * - Admin : peut voir tous les items
 * - User : ne voit que ses propres items via order.userId
 */
export async function getOrderItems(
	params: GetOrderItemsParams
): Promise<GetOrderItemsReturn> {
	try {
		const [admin, session] = await Promise.all([isAdmin(), getSession()]);

		if (!admin && !session?.user?.id) {
			throw new Error("Authentication required");
		}

		const validation = getOrderItemsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters");
		}

		return await fetchOrderItems(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}

/**
 * Récupère les items de commande depuis la DB avec cache
 */
export async function fetchOrderItems(
	params: GetOrderItemsParams
): Promise<GetOrderItemsReturn> {
	"use cache";
	cacheOrdersDashboard();

	const sortOrder = (params.sortOrder ||
		GET_ORDER_ITEMS_DEFAULT_SORT_ORDER) as Prisma.SortOrder;

	try {
		const where = buildOrderItemsWhereClause(params);

		const orderBy: Prisma.OrderItemOrderByWithRelationInput[] = [
			{
				[params.sortBy]: sortOrder,
			} as Prisma.OrderItemOrderByWithRelationInput,
			{ id: "asc" },
		];

		const take = Math.min(
			Math.max(1, params.perPage || GET_ORDER_ITEMS_DEFAULT_PER_PAGE),
			GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const orderItems = await prisma.orderItem.findMany({
			where,
			select: GET_ORDER_ITEMS_DEFAULT_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			orderItems,
			take,
			params.direction,
			params.cursor
		);

		return {
			orderItems: items,
			pagination,
		};
	} catch (error) {
		const baseReturn = {
			orderItems: [],
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
					: "Failed to fetch order items",
		};

		return baseReturn as GetOrderItemsReturn & { error: string };
	}
}
