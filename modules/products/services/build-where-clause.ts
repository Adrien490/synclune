import { Prisma } from "@/app/generated/prisma/client";
import type { GetProductSkusInput } from "@/modules/skus/schemas/get-skus.schemas";
import { buildFilterConditions } from "./build-filter-conditions";

/**
 * Construit la clause WHERE complète pour la récupération des SKUs de produits
 */
export const buildWhereClause = (
	params: GetProductSkusInput
): Prisma.ProductSkuWhereInput => {
	const whereClause: Prisma.ProductSkuWhereInput = {};
	const andConditions: Prisma.ProductSkuWhereInput[] = [];
	const filters = params.filters ?? {};

	// Conditions de recherche textuelle (légère)
	if (typeof params.search === "string" && params.search.trim()) {
		const searchTerm = params.search.trim();
		whereClause.OR = [
			{
				sku: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			{
				product: {
					title: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
					},
				},
			},
			{
				color: {
					name: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
					},
				},
			},
			{
				material: {
					name: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
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
