import { Prisma } from "@/app/generated/prisma/client";
import type {
	GetProductTypesParams,
	ProductTypeFilters,
} from "../types/product-type.types";

// ============================================================================
// PRODUCT TYPE QUERY BUILDER UTILS
// ============================================================================

export function buildProductTypeSearchConditions(
	search: string
): Prisma.ProductTypeWhereInput | null {
	if (!search || search.trim().length === 0) return null;
	const searchTerm = search.trim();

	return {
		OR: [
			{ label: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
			{ slug: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
			{
				description: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
		],
	};
}

export function buildProductTypeFilterConditions(
	filters: ProductTypeFilters
): Prisma.ProductTypeWhereInput {
	const conditions: Prisma.ProductTypeWhereInput = {};

	if (filters.isActive !== undefined) {
		conditions.isActive = filters.isActive;
	}

	if (filters.isSystem !== undefined) {
		conditions.isSystem = filters.isSystem;
	}

	if (filters.hasProducts !== undefined) {
		if (filters.hasProducts) {
			conditions.products = { some: {} };
		} else {
			conditions.products = { none: {} };
		}
	}

	return conditions;
}

export function buildProductTypeWhereClause(
	params: GetProductTypesParams
): Prisma.ProductTypeWhereInput {
	const conditions: Prisma.ProductTypeWhereInput[] = [];

	if (params.search) {
		const searchConditions = buildProductTypeSearchConditions(params.search);
		if (searchConditions) {
			conditions.push(searchConditions);
		}
	}

	if (params.filters) {
		const filterConditions = buildProductTypeFilterConditions(params.filters);
		if (Object.keys(filterConditions).length > 0) {
			conditions.push(filterConditions);
		}
	}

	if (conditions.length === 0) return {};
	if (conditions.length === 1) return conditions[0];

	return { AND: conditions };
}
