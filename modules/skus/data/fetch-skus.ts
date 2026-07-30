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
	cacheLife("user");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST, PRODUCTS_CACHE_TAGS.SKUS_LIST);

	// ⚠️ AUCUN try/catch ici : il était À L'INTÉRIEUR du scope `"use cache"`, donc une
	// panne DB transitoire mettait une liste VIDE en cache pour toute la fenêtre du
	// profil `user` (1 min revalidate / 2 min stale) — l'admin voyait « aucune
	// variante » plusieurs minutes après le rétablissement. Le repli appartient à
	// l'appelant, HORS du scope de cache (même pattern que `get-sku.ts`).
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
}
