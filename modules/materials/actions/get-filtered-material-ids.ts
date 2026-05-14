"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_MATERIAL_ACTION_LIMIT } from "../constants/materials.constants";
import { buildMaterialWhereClause } from "../services/materials-query-builder";
import type { GetMaterialsParams } from "../types/materials.types";

export interface FilteredMaterialIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Bypass `getMaterials` (qui charge _count.skus) — ici on
 * paye ~10 KB en chargeant `select: { id: true }` + un `count` exact.
 */
export async function getFilteredMaterialIds(
	params: Pick<GetMaterialsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const where = buildMaterialWhereClause({
			...params,
			cursor: undefined,
			direction: "forward",
			perPage: BULK_MATERIAL_ACTION_LIMIT,
		});

		const [rows, totalCount] = await Promise.all([
			prisma.material.findMany({
				where,
				select: { id: true },
				take: BULK_MATERIAL_ACTION_LIMIT,
			}),
			prisma.material.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucun matériau ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_MATERIAL_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les matériaux filtrés");
	}
}
