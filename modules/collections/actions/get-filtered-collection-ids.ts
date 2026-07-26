"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_COLLECTION_ACTION_LIMIT } from "../constants/collection.constants";
import { buildCollectionWhereClause } from "../services/collection-query-builder";
import type { GetCollectionsParams } from "../types/collection.types";

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Bypass `getCollections` (qui charge products+skus+images) — ici on
 * paye ~10 KB en chargeant `select: { id: true }` + un `count` exact.
 */
export async function getFilteredCollectionIds(
	params: Pick<GetCollectionsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_COLLECTION_LIMITS.REFRESH,
		cap: BULK_COLLECTION_ACTION_LIMIT,
		emptyMessage: "Aucune collection ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les collections filtrées",
		buildWhere: () =>
			buildCollectionWhereClause({
				...params,
				cursor: undefined,
				direction: undefined,
				perPage: BULK_COLLECTION_ACTION_LIMIT,
			}),
		fetchIds: (where) =>
			prisma.collection.findMany({
				where,
				select: { id: true },
				take: BULK_COLLECTION_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.collection.count({ where }),
	});
}
