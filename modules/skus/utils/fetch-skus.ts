import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { cacheDashboardInventory } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import {
	GET_PRODUCT_SKUS_DEFAULT_PER_PAGE,
	GET_PRODUCT_SKUS_DEFAULT_SELECT,
	GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
} from "../constants/skus-constants";
import { GetProductSkusParams, GetProductSkusReturn } from "../types/skus.types";
import { buildWhereClause } from "@/modules/products/services/build-where-clause";

const getSortDirection = (sortBy: string): "asc" | "desc" => {
	if (sortBy.endsWith("-ascending")) return "asc";
	if (sortBy.endsWith("-descending")) return "desc";
	return "asc";
};

/**
 * Récupère la liste des SKUs de produits avec pagination, tri et filtrage
 * Admin uniquement
 */
export async function fetchProductSkus(
	params: GetProductSkusParams
): Promise<GetProductSkusReturn> {
	"use cache";

	// Cache configuration for dashboard inventory list
	cacheDashboardInventory();

	try {
		const where = buildWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		// Toujours trier le SKU par défaut en premier, puis appliquer le tri sélectionné
		const userSortConfig: Prisma.ProductSkuOrderByWithRelationInput[] =
			params.sortBy.startsWith("sku-")
				? [{ sku: direction }, { id: "asc" }]
				: params.sortBy.startsWith("price-")
					? [{ priceInclTax: direction }, { id: "asc" }]
					: params.sortBy.startsWith("stock-")
						? [{ inventory: direction }, { id: "asc" }]
						: params.sortBy.startsWith("created-")
							? [{ createdAt: direction }, { id: "asc" }]
							: [{ createdAt: "desc" }, { id: "asc" }];

		const orderBy: Prisma.ProductSkuOrderByWithRelationInput[] = [
			{ isDefault: "desc" }, // SKU par défaut toujours en premier
			...userSortConfig,
		];

		const take = Math.min(
			Math.max(1, params.perPage || GET_PRODUCT_SKUS_DEFAULT_PER_PAGE),
			GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE
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
			params.cursor
		);

		return {
			productSkus: items,
			pagination,
		};
	} catch (error) {
		// console.error("Product SKUs fetch error:", {
		// 	error: error instanceof Error ? error.message : "Unknown error",
		// 	params: JSON.stringify(params, null, 2),
		// 	stack: error instanceof Error ? error.stack : undefined,
		// });

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
