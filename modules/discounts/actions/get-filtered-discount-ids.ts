"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_DISCOUNT_ACTION_LIMIT } from "../constants/discount.constants";
import { buildDiscountWhereClause } from "../services/discount-query-builder";
import type { GetDiscountsParams } from "../types/discount.types";

export interface FilteredDiscountIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 */
export async function getFilteredDiscountIds(
	params: Pick<GetDiscountsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const where = buildDiscountWhereClause({
			...params,
			cursor: undefined,
			direction: "forward",
			perPage: BULK_DISCOUNT_ACTION_LIMIT,
		});

		const [rows, totalCount] = await Promise.all([
			prisma.discount.findMany({
				where,
				select: { id: true },
				take: BULK_DISCOUNT_ACTION_LIMIT,
			}),
			prisma.discount.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucun code promo ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_DISCOUNT_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les codes promo filtrés");
	}
}
