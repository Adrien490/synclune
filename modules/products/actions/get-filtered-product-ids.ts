"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_REFRESH_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_PRODUCT_ACTION_LIMIT } from "../constants/product.constants";
import {
	buildExactSearchConditions,
	buildProductWhereClause,
	buildSearchConditions,
} from "../services/product-query-builder";
import type { GetProductsParams } from "../types/product.types";

export interface FilteredProductIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés".
 * Bypass `getProducts` (qui charge skus+images+collections, ~5 MB) — ici on
 * paye ~10 KB en chargeant `select: { id: true }` + un `count` exact.
 */
export async function getFilteredProductIds(
	params: Pick<GetProductsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_REFRESH_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const searchResult = params.search
			? params.search.trim().length < 3
				? buildExactSearchConditions(params.search)
				: await buildSearchConditions(params.search)
			: undefined;

		const where = buildProductWhereClause(
			{
				...params,
				cursor: undefined,
				direction: undefined,
				perPage: BULK_PRODUCT_ACTION_LIMIT,
			},
			searchResult,
		);

		const [rows, totalCount] = await Promise.all([
			prisma.product.findMany({
				where,
				select: { id: true },
				take: BULK_PRODUCT_ACTION_LIMIT,
			}),
			prisma.product.count({ where }),
		]);

		if (rows.length === 0) {
			return error("Aucun produit ne correspond aux filtres actuels");
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: BULK_PRODUCT_ACTION_LIMIT,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de charger les produits filtrés");
	}
}
