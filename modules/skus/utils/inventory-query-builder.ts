import { Prisma } from "@/app/generated/prisma/client";
import type {
	GetSkuStocksParams,
	InventoryFilters,
} from "../types/inventory.types";

// ============================================================================
// INVENTORY QUERY BUILDER UTILS
// ============================================================================

export function buildInventorySearchConditions(
	search?: string
): Prisma.ProductSkuWhereInput {
	if (!search || search.trim().length === 0) return {};
	const searchTerm = search.trim();

	return {
		OR: [
			{ sku: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
			{
				product: {
					title: { contains: searchTerm, mode: Prisma.QueryMode.insensitive },
				},
			},
		],
	};
}

export function buildInventoryFilterConditions(
	filters: InventoryFilters
): Prisma.ProductSkuWhereInput {
	const conditions: Prisma.ProductSkuWhereInput = {};

	if (filters.productTypeId) {
		const ids = Array.isArray(filters.productTypeId)
			? filters.productTypeId
			: [filters.productTypeId];
		if (ids.length === 1) {
			conditions.product = { typeId: ids[0] };
		} else if (ids.length > 1) {
			conditions.product = { typeId: { in: ids } };
		}
	}

	if (filters.colorId) {
		const ids = Array.isArray(filters.colorId)
			? filters.colorId
			: [filters.colorId];
		if (ids.length === 1) {
			conditions.colorId = ids[0];
		} else if (ids.length > 1) {
			conditions.colorId = { in: ids };
		}
	}

	if (filters.material) {
		const materials = Array.isArray(filters.material)
			? filters.material
			: [filters.material];
		if (materials.length === 1) {
			conditions.material = materials[0];
		} else if (materials.length > 1) {
			conditions.material = { in: materials };
		}
	}

	return conditions;
}

export function buildInventoryWhereClause(
	params: GetSkuStocksParams
): Prisma.ProductSkuWhereInput {
	const filterConditions = buildInventoryFilterConditions(
		params.filters || {
			hasActiveReservations: undefined,
			productTypeId: undefined,
			colorId: undefined,
			material: undefined,
			stockLevel: undefined,
		}
	);
	const searchConditions = buildInventorySearchConditions(params.search);

	const baseConditions: Prisma.ProductSkuWhereInput = {
		...filterConditions,
		...searchConditions,
	};

	if (params.filters?.stockLevel) {
		const level = params.filters.stockLevel;
		const andConditions: Prisma.ProductSkuWhereInput[] = [];

		if (level === "critical") {
			andConditions.push({ inventory: { lt: 5 } });
		} else if (level === "low") {
			andConditions.push({ inventory: { lt: 10 } });
		} else if (level === "normal") {
			andConditions.push({ inventory: { gte: 10, lte: 50 } });
		} else if (level === "high") {
			andConditions.push({ inventory: { gt: 50 } });
		}

		if (andConditions.length > 0) {
			return { AND: [baseConditions, ...andConditions] };
		}
	}

	return baseConditions;
}
