import { CollectionStatus, Prisma } from "@/app/generated/prisma";
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
			// Filtrer pour ne compter que les produits PUBLIC
			conditions.products = {
				some: {
					product: {
						status: "PUBLIC",
					},
				},
			};
		} else {
			conditions.products = { none: {} };
		}
	}

	// Filtre par statut
	if (filters.status !== undefined) {
		if (Array.isArray(filters.status)) {
			conditions.status = { in: filters.status };
		} else {
			conditions.status = filters.status;
		}
	}

	return conditions;
}

/**
 * Construit les conditions de filtre avec un statut par défaut (PUBLIC pour la boutique)
 */
export function buildCollectionStatusFilter(
	status?: CollectionStatus | CollectionStatus[]
): Prisma.CollectionWhereInput {
	if (!status) {
		return { status: CollectionStatus.PUBLIC };
	}

	if (Array.isArray(status)) {
		return { status: { in: status } };
	}

	return { status };
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
