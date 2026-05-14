"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_REFUND_ACTION_LIMIT } from "../constants/refund.constants";
import { buildRefundWhereClause } from "../services/refund-query-builder";
import type { GetRefundsParams } from "../types/refund.types";

export interface FilteredRefundIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Note : seuls les remboursements PENDING sont éligibles à l'approbation bulk
 * (filtrage côté action `bulkApproveRefunds`, pas ici).
 */
export async function getFilteredRefundIds(
	params: Pick<GetRefundsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: REFUND_LIMITS.REFRESH,
		cap: BULK_REFUND_ACTION_LIMIT,
		emptyMessage: "Aucun remboursement ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les remboursements filtrés",
		buildWhere: () =>
			buildRefundWhereClause({
				...params,
				cursor: undefined,
				direction: "forward",
				perPage: BULK_REFUND_ACTION_LIMIT,
			}),
		fetchIds: (where) =>
			prisma.refund.findMany({
				where,
				select: { id: true },
				take: BULK_REFUND_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.refund.count({ where }),
	});
}
