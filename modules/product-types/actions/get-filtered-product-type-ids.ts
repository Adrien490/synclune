"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_PRODUCT_TYPE_ACTION_LIMIT } from "../constants/product-type.constants";
import { buildProductTypeWhereClause } from "../services/product-type-query-builder";
import type { GetProductTypesParams } from "../types/product-type.types";

export interface FilteredProductTypeIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Bypass `getProductTypes` (qui charge _count.products) — paye ~10 KB
 * en chargeant `select: { id: true }` + un `count` exact.
 *
 * Note : les types `isSystem: true` sont inclus côté UI ; le filtrage
 * d'éligibilité a lieu dans l'action `bulkToggleProductTypesStatus`
 * (atomic, anti-race-condition).
 */
export async function getFilteredProductTypeIds(
	params: Pick<GetProductTypesParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_PRODUCT_TYPE_LIMITS.REFRESH,
		cap: BULK_PRODUCT_TYPE_ACTION_LIMIT,
		emptyMessage: "Aucun type de bijou ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les types filtrés",
		buildWhere: () =>
			buildProductTypeWhereClause({
				...params,
				cursor: undefined,
				direction: "forward",
				perPage: BULK_PRODUCT_TYPE_ACTION_LIMIT,
				filters: params.filters ?? {},
			}),
		fetchIds: (where) =>
			prisma.productType.findMany({
				where,
				select: { id: true },
				take: BULK_PRODUCT_TYPE_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.productType.count({ where }),
	});
}
