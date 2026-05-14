"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
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
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const fullParams: GetUsersParams = {
			cursor: undefined,
			direction: "forward",
			perPage: BULK_USER_ACTION_LIMIT,
			search: params.search,
			sortBy: params.sortBy,
			sortOrder: params.sortOrder,
			filters: params.filters,
		};

		const where = buildUserWhereClause(fullParams);

		const [rows, totalCount] = await Promise.all([
			prisma.user.findMany({
				where,
				select: { id: true },
				take: BULK_USER_ACTION_LIMIT,
			}),
			prisma.user.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucun client ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_USER_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les clients filtrés");
	}
}
