"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_REFRESH_LIMIT } from "@/shared/lib/rate-limit-config";

import { getProducts } from "../data/get-products";
import type { GetProductsParams } from "../types/product.types";

const CROSS_PAGE_SELECT_HARD_CAP = 100;

interface GetFilteredProductIdsResult {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Server action — recupere jusqu'a 100 ids de produits matching le filtre
 * courant, indistinctement de la pagination cursor.
 *
 * Utilise par le banner "Selectionner les N produits filtres" du
 * MobileSelectionHeader. Le plafond 100 s'aligne sur les schemas bulk
 * (`bulk*ProductsSchema` max: 100) — au-dela, l'admin doit raffiner sa
 * recherche.
 *
 * Rate-limit reuse `ADMIN_PRODUCT_REFRESH_LIMIT` (10/min) car l'usage est
 * faible volume et similaire en frequence a un refresh.
 */
export async function getFilteredProductIds(
	params: Pick<GetProductsParams, "search" | "sortBy" | "filters">,
): Promise<{ error: string } | GetFilteredProductIdsResult> {
	const admin = await requireAdmin();
	if ("error" in admin) return { error: admin.error.message };

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_REFRESH_LIMIT);
	if ("error" in rateLimit) return { error: rateLimit.error.message };

	const result = await getProducts(
		{
			...params,
			perPage: CROSS_PAGE_SELECT_HARD_CAP,
		},
		{ isAdmin: true },
	);

	return {
		ids: result.products.map((p) => p.id),
		totalCount: result.totalCount,
		cappedAt: CROSS_PAGE_SELECT_HARD_CAP,
	};
}
