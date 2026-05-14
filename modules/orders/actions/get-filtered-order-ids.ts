"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_ORDER_ACTION_LIMIT } from "../constants/order.constants";
import { buildOrderWhereClause } from "../services/order-query-builder";
import type { GetOrdersParams } from "../types/order.types";

export interface FilteredOrderIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Note : seules les commandes PENDING/UNPAID sont éligibles à l'annulation
 * bulk (filtrage côté action `bulkCancelOrders`, pas ici).
 */
export async function getFilteredOrderIds(
	params: Pick<GetOrdersParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_ORDER_LIMITS.REFRESH,
		cap: BULK_ORDER_ACTION_LIMIT,
		emptyMessage: "Aucune commande ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les commandes filtrées",
		buildWhere: () =>
			buildOrderWhereClause({
				cursor: undefined,
				direction: "forward",
				perPage: BULK_ORDER_ACTION_LIMIT,
				search: params.search,
				sortBy: params.sortBy,
				filters: params.filters,
			}),
		fetchIds: (where) =>
			prisma.order.findMany({
				where,
				select: { id: true },
				take: BULK_ORDER_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.order.count({ where }),
	});
}
