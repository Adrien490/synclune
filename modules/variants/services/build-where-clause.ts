import { escapeLikePattern } from "@/shared/utils/escape-like-pattern";
import { Prisma } from "@/app/generated/prisma/client";
import type { GetProductVariantsInput } from "@/modules/variants/schemas/get-variants.schemas";
import { buildFilterConditions } from "./build-filter-conditions";

/**
 * Construit la clause WHERE complète pour la récupération des VARIANTs de produits
 */
export const buildWhereClause = (
	params: GetProductVariantsInput,
): Prisma.ProductVariantWhereInput => {
	const whereClause: Prisma.ProductVariantWhereInput = {};
	const andConditions: Prisma.ProductVariantWhereInput[] = [];
	const filters = params.filters ?? {};

	// Conditions de recherche textuelle (légère)
	if (typeof params.search === "string" && params.search.trim()) {
		// Echappement LIKE : Prisma `contains` ne neutralise pas % _ \ (P3-3, cf. escape-like-pattern.ts).
		const searchTerm = escapeLikePattern(params.search.trim());
		whereClause.OR = [
			{
				product: {
					name: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
					},
				},
			},
			{
				color: {
					is: {
						name: {
							contains: searchTerm,
							mode: Prisma.QueryMode.insensitive,
						},
					},
				},
			},
			{
				material: {
					is: {
						name: {
							contains: searchTerm,
							mode: Prisma.QueryMode.insensitive,
						},
					},
				},
			},
		];
	}

	const filterConditions = buildFilterConditions(filters);
	if (filterConditions.length > 0) {
		andConditions.push(...filterConditions);
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
};
