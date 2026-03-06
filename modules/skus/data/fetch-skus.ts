import { type Prisma } from "@/app/generated/prisma/client";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import {
	GET_PRODUCT_SKUS_DEFAULT_PER_PAGE,
	GET_PRODUCT_SKUS_DEFAULT_SELECT,
	GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
} from "../constants/sku.constants";
import { type GetProductSkusParams, type GetProductSkusReturn } from "../types/skus.types";
import { buildWhereClause } from "@/modules/skus/services/build-where-clause";
import { getSortDirection } from "@/shared/utils/sort-direction";

/**
 * Récupère la liste des SKUs de produits avec pagination, tri et filtrage
 * Admin uniquement
 */
export async function fetchProductSkus(
	params: GetProductSkusParams,
): Promise<GetProductSkusReturn> {
	"use cache";

	// Cache configuration for inventory list (used in admin dashboard)
	cacheLife("dashboard");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST, PRODUCTS_CACHE_TAGS.SKUS_LIST);

	try {
		const where = buildWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		// Toujours trier le SKU par défaut en premier, puis appliquer le tri sélectionné
		const sortFieldMap: Record<string, Prisma.ProductSkuOrderByWithRelationInput[]> = {
			"sku-ascending": [{ sku: direction }, { id: "asc" }],
			"sku-descending": [{ sku: direction }, { id: "asc" }],
			"price-ascending": [{ priceInclTax: direction }, { id: "asc" }],
			"price-descending": [{ priceInclTax: direction }, { id: "asc" }],
			"stock-ascending": [{ inventory: direction }, { id: "asc" }],
			"stock-descending": [{ inventory: direction }, { id: "asc" }],
			"created-ascending": [{ createdAt: direction }, { id: "asc" }],
			"created-descending": [{ createdAt: direction }, { id: "asc" }],
		};
		const userSortConfig: Prisma.ProductSkuOrderByWithRelationInput[] = sortFieldMap[
			params.sortBy
		] ?? [{ createdAt: "desc" }, { id: "asc" }];

		const orderBy: Prisma.ProductSkuOrderByWithRelationInput[] = [
			{ isDefault: "desc" }, // SKU par défaut toujours en premier
			...userSortConfig,
		];

		const take = Math.min(
			Math.max(1, params.perPage || GET_PRODUCT_SKUS_DEFAULT_PER_PAGE),
			GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const productSkus = await prisma.productSku.findMany({
			where,
			select: GET_PRODUCT_SKUS_DEFAULT_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			productSkus,
			take,
			params.direction,
			params.cursor,
		);

		return {
			productSkus: items,
			pagination,
		};
	} catch (error) {
		const baseReturn = {
			productSkus: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			error:
				process.env.NODE_ENV === "development"
					? error instanceof Error
						? error.message
						: "Unknown error"
					: "Failed to fetch product SKUs",
		};

		return baseReturn as GetProductSkusReturn & { error: string };
	}
}
