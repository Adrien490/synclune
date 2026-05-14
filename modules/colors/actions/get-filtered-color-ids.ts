"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
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
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const where = buildColorWhereClause({
			...params,
			cursor: undefined,
			direction: "forward",
			perPage: BULK_COLOR_ACTION_LIMIT,
		});

		const [rows, totalCount] = await Promise.all([
			prisma.color.findMany({
				where,
				select: { id: true },
				take: BULK_COLOR_ACTION_LIMIT,
			}),
			prisma.color.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucune couleur ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_COLOR_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les couleurs filtrées");
	}
}
