import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { isAdmin } from "@/modules/auth/utils/guards";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";
import { cacheLife, cacheTag } from "next/cache";

import {
	GET_INVENTORY_DEFAULT_PER_PAGE,
	GET_INVENTORY_MAX_RESULTS_PER_PAGE,
	GET_INVENTORY_SELECT,
	INVENTORY_SORT_LABELS,
	INVENTORY_SORT_OPTIONS,
} from "../constants/inventory.constants";
import { getSkuStocksSchema } from "../schemas/inventory.schemas";
import type {
	GetSkuStocksParams,
	GetSkuStocksReturn,
	SkuStock,
} from "../types/inventory.types";
import { buildInventoryWhereClause } from "../utils/inventory-query-builder";

// Re-export pour compatibilité
export {
	GET_INVENTORY_DEFAULT_PER_PAGE,
	INVENTORY_SORT_LABELS as SORT_LABELS,
	INVENTORY_SORT_OPTIONS as SORT_OPTIONS,
} from "../constants/inventory.constants";
export type {
	GetSkuStocksParams,
	GetSkuStocksReturn,
	SkuStock,
} from "../types/inventory.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des niveaux de stock par SKU
 * Protection: Nécessite un compte ADMIN
 */
export async function getSkuStocks(
	params: GetSkuStocksParams
): Promise<GetSkuStocksReturn> {
	const admin = await isAdmin();
	if (!admin) {
		throw new Error("Accès non autorisé. Droits administrateur requis.");
	}

	const validated = getSkuStocksSchema.parse(params);

	return fetchSkuStocks(validated);
}

/**
 * Récupère les niveaux de stock SKU depuis la DB avec cache
 */
async function fetchSkuStocks(
	params: GetSkuStocksParams
): Promise<GetSkuStocksReturn> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);

	try {
		const where = buildInventoryWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.ProductSkuOrderByWithRelationInput[] =
			params.sortBy.startsWith("available-")
				? [{ inventory: direction }, { id: "asc" }]
				: params.sortBy.startsWith("sku-")
					? [{ sku: direction }, { id: "asc" }]
					: [{ inventory: "asc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_INVENTORY_DEFAULT_PER_PAGE),
			GET_INVENTORY_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const items = await prisma.productSku.findMany({
			where,
			select: GET_INVENTORY_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items: processedItems, pagination } = processCursorResults(
			items,
			take,
			params.direction,
			params.cursor
		);

		return { items: processedItems, pagination };
	} catch (error) {
		const baseReturn = {
			items: [],
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
					: "Failed to fetch inventory items",
		};

		return baseReturn as GetSkuStocksReturn & { error: string };
	}
}
