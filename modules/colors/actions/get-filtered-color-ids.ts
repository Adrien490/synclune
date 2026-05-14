"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_COLOR_ACTION_LIMIT } from "../constants/color.constants";
import { buildColorWhereClause } from "../services/color-query-builder";
import type { GetColorsParams } from "../types/color.types";

export interface FilteredColorIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Bypass `getColors` (qui charge _count.skus) — ici on
 * paye ~10 KB en chargeant `select: { id: true }` + un `count` exact.
 */
export async function getFilteredColorIds(
	params: Pick<GetColorsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_COLOR_LIMITS.REFRESH,
		cap: BULK_COLOR_ACTION_LIMIT,
		emptyMessage: "Aucune couleur ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les couleurs filtrées",
		buildWhere: () =>
			buildColorWhereClause({
				...params,
				cursor: undefined,
				direction: "forward",
				perPage: BULK_COLOR_ACTION_LIMIT,
			}),
		fetchIds: (where) =>
			prisma.color.findMany({
				where,
				select: { id: true },
				take: BULK_COLOR_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.color.count({ where }),
	});
}
