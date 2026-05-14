"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_COLLECTION_ACTION_LIMIT } from "../constants/collection.constants";
import { buildCollectionWhereClause } from "../services/collection-query-builder";
import type { GetCollectionsParams } from "../types/collection.types";

export interface FilteredCollectionIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Bypass `getCollections` (qui charge products+skus+images) — ici on
 * paye ~10 KB en chargeant `select: { id: true }` + un `count` exact.
 */
export async function getFilteredCollectionIds(
	params: Pick<GetCollectionsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const where = buildCollectionWhereClause({
			...params,
			cursor: undefined,
			direction: undefined,
			perPage: BULK_COLLECTION_ACTION_LIMIT,
		});

		const [rows, totalCount] = await Promise.all([
			prisma.collection.findMany({
				where,
				select: { id: true },
				take: BULK_COLLECTION_ACTION_LIMIT,
			}),
			prisma.collection.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucune collection ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_COLLECTION_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les collections filtrées");
	}
}
