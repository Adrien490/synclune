import { Prisma } from "@/app/generated/prisma/client";
import type { GetColorsParams } from "../types/color.types";

// ============================================================================
// COLOR QUERY BUILDER UTILS
// ============================================================================

export function buildColorSearchConditions(
	search: string
): Prisma.ColorWhereInput | null {
	if (!search || search.trim().length === 0) return null;
	const searchTerm = search.trim();

	return {
		OR: [
			{ name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
			{ slug: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
			{ hex: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
		],
	};
}

export function buildColorWhereClause(
	params: GetColorsParams
): Prisma.ColorWhereInput {
	const whereClause: Prisma.ColorWhereInput = {};
	const andConditions: Prisma.ColorWhereInput[] = [];

	if (params.search) {
		const searchCondition = buildColorSearchConditions(params.search);
		if (searchCondition) {
			andConditions.push(searchCondition);
		}
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
