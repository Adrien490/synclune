import { Prisma } from "@/app/generated/prisma/client";
import type { ColorFilters, GetColorsParams } from "../types/color.types";

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

export function buildColorFilterConditions(
	filters: ColorFilters
): Prisma.ColorWhereInput {
	const conditions: Prisma.ColorWhereInput = {};

	if (filters.isActive !== undefined) {
		conditions.isActive = filters.isActive;
	}

	return conditions;
}

export function buildColorWhereClause(
	params: GetColorsParams
): Prisma.ColorWhereInput {
	const andConditions: Prisma.ColorWhereInput[] = [];

	if (params.search) {
		const searchCondition = buildColorSearchConditions(params.search);
		if (searchCondition) {
			andConditions.push(searchCondition);
		}
	}

	if (params.filters) {
		const filterConditions = buildColorFilterConditions(params.filters);
		if (Object.keys(filterConditions).length > 0) {
			andConditions.push(filterConditions);
		}
	}

	if (andConditions.length === 0) return {};
	if (andConditions.length === 1) return andConditions[0];

	return { AND: andConditions };
}
