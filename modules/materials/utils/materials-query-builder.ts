import { Prisma } from "@/app/generated/prisma";
import type { GetMaterialsParams } from "../types/materials.types";

// ============================================================================
// MATERIAL QUERY BUILDER UTILS
// ============================================================================

export function buildMaterialSearchConditions(
	search: string
): Prisma.MaterialWhereInput | null {
	if (!search || search.trim().length === 0) return null;
	const searchTerm = search.trim();

	return {
		OR: [
			{ name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
			{ slug: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
			{ description: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
		],
	};
}

export function buildMaterialWhereClause(
	params: GetMaterialsParams
): Prisma.MaterialWhereInput {
	const whereClause: Prisma.MaterialWhereInput = {};
	const andConditions: Prisma.MaterialWhereInput[] = [];

	// Filtre par statut actif
	if (params.filters?.isActive !== undefined) {
		andConditions.push({ isActive: params.filters.isActive });
	}

	// Recherche textuelle
	if (params.search) {
		const searchCondition = buildMaterialSearchConditions(params.search);
		if (searchCondition) {
			andConditions.push(searchCondition);
		}
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
