"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
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
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const fullParams: GetOrdersParams = {
			cursor: undefined,
			direction: "forward",
			perPage: BULK_ORDER_ACTION_LIMIT,
			search: params.search,
			sortBy: params.sortBy,
			filters: params.filters,
		};

		const where = buildOrderWhereClause(fullParams);

		const [rows, totalCount] = await Promise.all([
			prisma.order.findMany({
				where,
				select: { id: true },
				take: BULK_ORDER_ACTION_LIMIT,
			}),
			prisma.order.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucune commande ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_ORDER_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les commandes filtrées");
	}
}
