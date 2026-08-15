import { escapeLikePattern } from "@/shared/utils/escape-like-pattern";
import { Prisma } from "@/app/generated/prisma/client";
import type { GetProductTypesParams, ProductTypeFilters } from "../types/product-type.types";

// ============================================================================
// PRODUCT TYPE QUERY BUILDER UTILS
// ============================================================================

export function buildProductTypeSearchConditions(
	search: string,
): Prisma.ProductTypeWhereInput | null {
	if (!search || search.trim().length === 0) return null;
	// Echappement LIKE : Prisma `contains` ne neutralise pas % _ \ (P3-3, cf. escape-like-pattern.ts).
	const searchTerm = escapeLikePattern(search.trim());

	return {
		OR: [
			{ label: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
			{ slug: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
		],
	};
}

export function buildProductTypeFilterConditions(
	filters: ProductTypeFilters,
): Prisma.ProductTypeWhereInput {
	const conditions: Prisma.ProductTypeWhereInput = {};

	if (filters.hasProducts !== undefined) {
		// Restreint aux produits actifs : un ProductType qui n'a que des brouillons
		// se rendrait comme catégorie vide (signal "thin content" pour Google).
		const activeProductsOnly = { active: true } as const;
		if (filters.hasProducts) {
			conditions.products = { some: activeProductsOnly };
		} else {
			conditions.products = { none: activeProductsOnly };
		}
	}

	return conditions;
}

export function buildProductTypeWhereClause(
	params: GetProductTypesParams,
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
	if (conditions.length === 1) return conditions[0]!;

	return { AND: conditions };
}
