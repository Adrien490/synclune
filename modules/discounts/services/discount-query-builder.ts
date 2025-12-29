import { Prisma } from "@/app/generated/prisma/client";
import type { GetDiscountsParams } from "../types/discount.types";

// ============================================================================
// DISCOUNT QUERY BUILDER
// ============================================================================

/**
 * Construit la clause WHERE pour la recherche de codes promo
 */
export function buildDiscountWhereClause(
	params: GetDiscountsParams
): Prisma.DiscountWhereInput {
	const where: Prisma.DiscountWhereInput = {};
	const AND: Prisma.DiscountWhereInput[] = [];

	// Recherche textuelle
	if (params.search) {
		AND.push({
			code: { contains: params.search, mode: "insensitive" },
		});
	}

	// Filtre par type
	if (params.filters?.type) {
		AND.push({ type: params.filters.type });
	}

	// Filtre par statut actif
	if (params.filters?.isActive !== undefined) {
		AND.push({ isActive: params.filters.isActive });
	}

	// Filtre par utilisation
	if (params.filters?.hasUsages !== undefined) {
		AND.push({
			usageCount: params.filters.hasUsages ? { gt: 0 } : { equals: 0 },
		});
	}

	if (AND.length > 0) {
		where.AND = AND;
	}

	return where;
}
