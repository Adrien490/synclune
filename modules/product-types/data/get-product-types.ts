import { type Prisma } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import { cacheProductTypesList } from "../constants/cache";

import {
	GET_PRODUCT_TYPES_DEFAULT_PER_PAGE,
	GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE,
	GET_PRODUCT_TYPES_SELECT,
} from "../constants/product-type.constants";
import { getProductTypesSchema } from "../schemas/product-type.schemas";
import type {
	GetProductTypesParams,
	GetProductTypesParamsInput,
	GetProductTypesReturn,
} from "../types/product-type.types";
import { buildProductTypeWhereClause } from "../services/product-type-query-builder";

// Re-exports
export { PRODUCT_TYPES_SORT_LABELS as SORT_LABELS } from "../constants/product-type.constants";
export type { GetProductTypesParams, GetProductTypesReturn } from "../types/product-type.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère les types de produits (bijoux). Accessible publiquement — schéma
 * lean : ProductType n'a plus de statut actif/inactif, il n'y a donc plus de
 * visibilité à forcer.
 */
export async function getProductTypes(
	params: GetProductTypesParamsInput,
	// Conservé pour compatibilité d'appel depuis un scope "use cache" (navbar).
	_options?: { isAdmin?: false },
): Promise<GetProductTypesReturn> {
	const validation = getProductTypesSchema.safeParse(params);

	if (!validation.success) {
		// Fail-safe, pas fail-closed : les params viennent des searchParams URL
		// (forgeables). Un `throw` ici cassait la page entière (error boundary)
		// sur un simple `?search=` trop long — contrat aligné sur
		// `filters-fail-safe.regression.test.ts` (orders). Audit recherche
		// 2026-08-01, P2-2.
		logger.warn("getProductTypes: invalid parameters, returning empty result", {
			service: "getProductTypes",
		});
		return {
			productTypes: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
		};
	}

	return fetchProductTypes(validation.data);
}

/**
 * Récupère les types de produits depuis la DB avec cache
 */
async function fetchProductTypes(params: GetProductTypesParams): Promise<GetProductTypesReturn> {
	"use cache";
	cacheProductTypesList();

	const take = Math.min(
		Math.max(1, params.perPage || GET_PRODUCT_TYPES_DEFAULT_PER_PAGE),
		GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE,
	);

	try {
		const where = buildProductTypeWhereClause(params);
		const sortByCountDirection = getSortDirection(params.sortBy);

		const orderBy: Prisma.ProductTypeOrderByWithRelationInput[] = params.sortBy.startsWith("label-")
			? [{ label: sortByCountDirection }, { id: "asc" }]
			: params.sortBy.startsWith("products-")
				? [{ products: { _count: sortByCountDirection } }, { id: "asc" }]
				: [{ label: "asc" }, { id: "asc" }];

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const [productTypes, totalCount] = await Promise.all([
			prisma.productType.findMany({
				where,
				select: GET_PRODUCT_TYPES_SELECT,
				orderBy,
				...cursorConfig,
			}),
			prisma.productType.count({ where }),
		]);

		const { items, pagination } = processCursorResults(
			productTypes,
			take,
			params.direction,
			params.cursor,
		);

		return { productTypes: items, pagination, totalCount };
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductTypes" },
		});
		// Rethrow → remonté par <Suspense> à error.tsx (vs faux empty state)
		throw error;
	}
}
