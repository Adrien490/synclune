import { type Prisma } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import { cacheProductTypes } from "../constants/cache";

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
export type {
	GetProductTypesParams,
	GetProductTypesParamsInput,
	GetProductTypesReturn,
} from "../types/product-type.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les types de produits
 * Accessible publiquement (pas de restriction admin)
 */
export async function getProductTypes(
	params: GetProductTypesParamsInput,
): Promise<GetProductTypesReturn> {
	const validation = getProductTypesSchema.safeParse(params);

	if (!validation.success) {
		throw new Error("Invalid parameters");
	}

	return fetchProductTypes(validation.data);
}

/**
 * Récupère les types de produits depuis la DB avec cache
 */
async function fetchProductTypes(params: GetProductTypesParams): Promise<GetProductTypesReturn> {
	"use cache";
	cacheProductTypes();

	const take = Math.min(
		Math.max(1, params.perPage || GET_PRODUCT_TYPES_DEFAULT_PER_PAGE),
		GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE,
	);

	try {
		const where = buildProductTypeWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.ProductTypeOrderByWithRelationInput[] = params.sortBy.startsWith("label-")
			? [{ label: direction }, { id: "asc" }]
			: params.sortBy.startsWith("products-")
				? [{ products: { _count: direction } }, { id: "asc" }]
				: [{ label: "asc" }, { id: "asc" }];

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const productTypes = await prisma.productType.findMany({
			where,
			select: GET_PRODUCT_TYPES_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			productTypes,
			take,
			params.direction,
			params.cursor,
		);

		return { productTypes: items, pagination };
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductTypes" },
		});

		return {
			productTypes: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}
}
