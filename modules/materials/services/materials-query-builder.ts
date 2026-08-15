import { escapeLikePattern } from "@/shared/utils/escape-like-pattern";
import { Prisma } from "@/app/generated/prisma/client";
import type { GetMaterialsParams } from "../types/materials.types";

// ============================================================================
// MATERIAL QUERY BUILDER UTILS
// ============================================================================

export function buildMaterialSearchConditions(search: string): Prisma.MaterialWhereInput | null {
	if (!search || search.trim().length === 0) return null;
	// Echappement LIKE : Prisma `contains` ne neutralise pas % _ \ (P3-3, cf. escape-like-pattern.ts).
	const searchTerm = escapeLikePattern(search.trim());

	return {
		OR: [{ name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } }],
	};
}

export function buildMaterialWhereClause(params: GetMaterialsParams): Prisma.MaterialWhereInput {
	const whereClause: Prisma.MaterialWhereInput = {};
	const andConditions: Prisma.MaterialWhereInput[] = [];

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
