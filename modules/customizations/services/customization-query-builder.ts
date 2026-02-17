import type { Prisma } from "@/app/generated/prisma/client";
import type { CustomizationFilters } from "../types/customization.types";

// ============================================================================
// CUSTOMIZATION QUERY BUILDER
// ============================================================================

/**
 * Builds the WHERE clause for customization requests listing
 */
export function buildCustomizationWhereClause(
	filters?: CustomizationFilters
): Prisma.CustomizationRequestWhereInput {
	const where: Prisma.CustomizationRequestWhereInput = { deletedAt: null };
	const AND: Prisma.CustomizationRequestWhereInput[] = [];

	if (filters?.status) {
		AND.push({ status: filters.status });
	}

	if (filters?.search) {
		AND.push({
			OR: [
				{ firstName: { contains: filters.search, mode: "insensitive" } },
				{ email: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}

	if (AND.length > 0) {
		where.AND = AND;
	}

	return where;
}
