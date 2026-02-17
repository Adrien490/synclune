import { Prisma } from "@/app/generated/prisma/client";
import type { CollectionFilters, GetCollectionsParams } from "../types/collection.types";

// ============================================================================
// COLLECTION QUERY BUILDER UTILS
// ============================================================================

export function buildCollectionSearchConditions(
	search: string
): Prisma.CollectionWhereInput | null {
	if (!search || search.trim().length === 0) return null;
	const searchTerm = search.trim();

	return {
		OR: [
			{ name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
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

export function buildCollectionFilterConditions(
	filters: CollectionFilters
): Prisma.CollectionWhereInput {
	const conditions: Prisma.CollectionWhereInput = {};

	if (filters.hasProducts !== undefined) {
		if (filters.hasProducts === true) {
			// Only count PUBLIC products (consistent with storefront display)
			conditions.products = {
				some: {
					product: {
						status: "PUBLIC",
					},
				},
			};
		} else {
			// No PUBLIC products (consistent with hasProducts: true filter)
			conditions.products = {
				none: {
					product: {
						status: "PUBLIC",
					},
				},
			};
		}
	}

	// Filter by status
	if (filters.status !== undefined) {
		if (Array.isArray(filters.status)) {
			conditions.status = { in: filters.status };
		} else {
			conditions.status = filters.status;
		}
	}

	return conditions;
}

export function buildCollectionWhereClause(
	params: GetCollectionsParams
): Prisma.CollectionWhereInput {
	const conditions: Prisma.CollectionWhereInput[] = [];

	if (params.filters) {
		const filterConditions = buildCollectionFilterConditions(params.filters);
		conditions.push(filterConditions);
	}

	if (params.search) {
		const searchConditions = buildCollectionSearchConditions(params.search);
		if (searchConditions) {
			conditions.push(searchConditions);
		}
	}

	if (conditions.length === 0) return {};
	if (conditions.length === 1) return conditions[0];

	return { AND: conditions };
}
