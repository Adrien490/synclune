"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_MATERIAL_ACTION_LIMIT } from "../constants/materials.constants";
import { buildMaterialWhereClause } from "../services/materials-query-builder";
import type { GetMaterialsParams } from "../types/materials.types";

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Bypass `getMaterials` (qui charge _count.skus) — ici on
 * paye ~10 KB en chargeant `select: { id: true }` + un `count` exact.
 */
export async function getFilteredMaterialIds(
	params: Pick<GetMaterialsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_MATERIAL_LIMITS.REFRESH,
		cap: BULK_MATERIAL_ACTION_LIMIT,
		emptyMessage: "Aucun matériau ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les matériaux filtrés",
		buildWhere: () =>
			buildMaterialWhereClause({
				...params,
				cursor: undefined,
				direction: "forward",
				perPage: BULK_MATERIAL_ACTION_LIMIT,
			}),
		fetchIds: (where) =>
			prisma.material.findMany({
				where,
				select: { id: true },
				take: BULK_MATERIAL_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.material.count({ where }),
	});
}
