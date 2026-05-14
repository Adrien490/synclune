"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
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
 *
 * Spécificité products : `buildSearchConditions` est asynchrone pour les
 * recherches ≥ 3 chars (embeddings full-text). Le helper `runCrossPageIdsAction`
 * supporte une `buildWhere` async et l'exécute **après** auth + rate-limit.
 */
export async function getFilteredProductIds(
	params: Pick<GetProductsParams, "search" | "sortBy" | "filters">,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_PRODUCT_REFRESH_LIMIT,
		cap: BULK_PRODUCT_ACTION_LIMIT,
		emptyMessage: "Aucun produit ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les produits filtrés",
		buildWhere: async () => {
			const searchResult = params.search
				? params.search.trim().length < 3
					? buildExactSearchConditions(params.search)
					: await buildSearchConditions(params.search)
				: undefined;

			return buildProductWhereClause(
				{
					...params,
					cursor: undefined,
					direction: undefined,
					perPage: BULK_PRODUCT_ACTION_LIMIT,
				},
				searchResult,
			);
		},
		fetchIds: (where) =>
			prisma.product.findMany({
				where,
				select: { id: true },
				take: BULK_PRODUCT_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.product.count({ where }),
	});
}
