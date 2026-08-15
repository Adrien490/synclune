import { escapeLikePattern } from "@/shared/utils/escape-like-pattern";
import { Prisma } from "@/app/generated/prisma/client";
import type { CollectionFilters, GetCollectionsParams } from "../types/collection.types";

// ============================================================================
// COLLECTION QUERY BUILDER UTILS
// ============================================================================

export function buildCollectionSearchConditions(
	search: string,
): Prisma.CollectionWhereInput | null {
	if (!search || search.trim().length === 0) return null;
	// Echappement LIKE : Prisma `contains` ne neutralise pas % _ \ (P3-3, cf. escape-like-pattern.ts).
	const searchTerm = escapeLikePattern(search.trim());

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
	filters: CollectionFilters,
): Prisma.CollectionWhereInput {
	const conditions: Prisma.CollectionWhereInput = {};

	if (filters.hasProducts !== undefined) {
		if (filters.hasProducts === true) {
			// Ne compter que les produits actifs (cohérent avec le storefront)
			conditions.products = { some: { active: true } };
		} else {
			conditions.products = { none: { active: true } };
		}
	}

	// Filtre par statut (booléen depuis le schéma lean)
	if (filters.active !== undefined) {
		conditions.active = filters.active;
	}

	return conditions;
}

export function buildCollectionWhereClause(
	params: GetCollectionsParams,
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
	if (conditions.length === 1) return conditions[0]!;

	return { AND: conditions };
}
