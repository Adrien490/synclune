"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
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
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const where = buildRefundWhereClause({
			...params,
			cursor: undefined,
			direction: "forward",
			perPage: BULK_REFUND_ACTION_LIMIT,
		});

		const [rows, totalCount] = await Promise.all([
			prisma.refund.findMany({
				where,
				select: { id: true },
				take: BULK_REFUND_ACTION_LIMIT,
			}),
			prisma.refund.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucun remboursement ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_REFUND_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les remboursements filtrés");
	}
}
