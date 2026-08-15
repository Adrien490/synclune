import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import type { PaginationInfo } from "@/shared/types/pagination.types";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import {
	GET_ORDERS_DEFAULT_PER_PAGE,
	GET_ORDERS_MAX_RESULTS_PER_PAGE,
	GET_ORDERS_SELECT,
} from "../constants/order.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { getOrdersSchema, type GetOrdersParams } from "../schemas/order.schemas";
import { buildOrderWhereClause } from "../services/order-query-builder";

export type OrderListItem = Prisma.OrderGetPayload<{ select: typeof GET_ORDERS_SELECT }>;

export interface GetOrdersReturn {
	orders: OrderListItem[];
	pagination: PaginationInfo;
	totalCount: number;
}

const EMPTY: GetOrdersReturn = {
	orders: [],
	pagination: { hasNextPage: false, hasPreviousPage: false, nextCursor: null, prevCursor: null },
	totalCount: 0,
};

/**
 * Liste admin des commandes — ADMIN ONLY, il n'existe aucune variante
 * publique (le client passe par /suivi-commande, jamais par une liste).
 */
export async function getOrders(params: Partial<GetOrdersParams>): Promise<GetOrdersReturn> {
	const validation = getOrdersSchema.safeParse(params);
	if (!validation.success) return EMPTY;

	if (!(await isAdmin())) return EMPTY;

	try {
		return await fetchOrders(validation.data);
	} catch (error) {
		if (!isPrerenderInterrupt(error)) {
			logger.error("[getOrders] Échec de lecture des commandes", { error });
		}
		return EMPTY;
	}
}

async function fetchOrders(params: GetOrdersParams): Promise<GetOrdersReturn> {
	"use cache";
	cacheLife("user");
	cacheTag(ORDERS_CACHE_TAGS.ADMIN_LIST);

	const where = buildOrderWhereClause(params);
	const orderBy: Prisma.OrderOrderByWithRelationInput[] = [
		{ createdAt: params.sortBy === "created-ascending" ? "asc" : "desc" },
		// Tie-break obligatoire pour la pagination par curseur.
		{ id: "asc" },
	];

	const take = Math.min(
		Math.max(1, params.perPage || GET_ORDERS_DEFAULT_PER_PAGE),
		GET_ORDERS_MAX_RESULTS_PER_PAGE,
	);
	const cursorConfig = buildCursorPagination({
		cursor: params.cursor,
		direction: params.direction,
		take,
	});

	const [rows, totalCount] = await Promise.all([
		prisma.order.findMany({ where, select: GET_ORDERS_SELECT, orderBy, ...cursorConfig }),
		prisma.order.count({ where }),
	]);

	const { items, pagination } = processCursorResults(rows, take, params.direction, params.cursor);
	return { orders: items, pagination, totalCount };
}
