"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_PRODUCT_TYPE_ACTION_LIMIT } from "../constants/product-type.constants";
import { buildProductTypeWhereClause } from "../services/product-type-query-builder";
import type { GetProductTypesParams } from "../types/product-type.types";

export interface FilteredProductTypeIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Bypass `getProductTypes` (qui charge _count.products) — paye ~10 KB
 * en chargeant `select: { id: true }` + un `count` exact.
 *
 * Note : les types `isSystem: true` sont inclus côté UI ; le filtrage
 * d'éligibilité a lieu dans l'action `bulkToggleProductTypesStatus`
 * (atomic, anti-race-condition).
 */
export async function getFilteredProductTypeIds(
	params: Pick<GetProductTypesParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const where = buildProductTypeWhereClause({
			...params,
			cursor: undefined,
			direction: "forward",
			perPage: BULK_PRODUCT_TYPE_ACTION_LIMIT,
			filters: params.filters ?? {},
		});

		const [rows, totalCount] = await Promise.all([
			prisma.productType.findMany({
				where,
				select: { id: true },
				take: BULK_PRODUCT_TYPE_ACTION_LIMIT,
			}),
			prisma.productType.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucun type de bijou ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_PRODUCT_TYPE_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les types filtrés");
	}
}
