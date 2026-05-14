"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_DISCOUNT_ACTION_LIMIT } from "../constants/discount.constants";
import { buildDiscountWhereClause } from "../services/discount-query-builder";
import type { GetDiscountsParams } from "../types/discount.types";

export interface FilteredDiscountIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 */
export async function getFilteredDiscountIds(
	params: Pick<GetDiscountsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_DISCOUNT_LIMITS.REFRESH,
		cap: BULK_DISCOUNT_ACTION_LIMIT,
		emptyMessage: "Aucun code promo ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les codes promo filtrés",
		buildWhere: () =>
			buildDiscountWhereClause({
				...params,
				cursor: undefined,
				direction: "forward",
				perPage: BULK_DISCOUNT_ACTION_LIMIT,
			}),
		fetchIds: (where) =>
			prisma.discount.findMany({
				where,
				select: { id: true },
				take: BULK_DISCOUNT_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.discount.count({ where }),
	});
}
