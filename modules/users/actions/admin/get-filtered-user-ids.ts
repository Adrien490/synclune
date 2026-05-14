"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_USER_ACTION_LIMIT } from "../../constants/user.constants";
import { buildUserWhereClause } from "../../services/user-query-builder";
import type { GetUsersParams } from "../../types/user.types";

export interface FilteredUserIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Note : les filtres self-skip et ≥1 admin sont appliqués serveur lors du
 * bulk-change-role, pas ici (UI-friendly = retourner tout, filtrer à l'action).
 */
export async function getFilteredUserIds(
	params: Pick<GetUsersParams, "search" | "sortBy" | "sortOrder" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_USER_LIMITS.REFRESH,
		cap: BULK_USER_ACTION_LIMIT,
		emptyMessage: "Aucun client ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les clients filtrés",
		buildWhere: () =>
			buildUserWhereClause({
				cursor: undefined,
				direction: "forward",
				perPage: BULK_USER_ACTION_LIMIT,
				search: params.search,
				sortBy: params.sortBy,
				sortOrder: params.sortOrder,
				filters: params.filters,
			}),
		fetchIds: (where) =>
			prisma.user.findMany({
				where,
				select: { id: true },
				take: BULK_USER_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.user.count({ where }),
	});
}
