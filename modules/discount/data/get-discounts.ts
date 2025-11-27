import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";
import { z } from "zod";

import { cacheDiscounts } from "../constants/cache";

import {
	GET_DISCOUNTS_DEFAULT_PER_PAGE,
	GET_DISCOUNTS_MAX_RESULTS_PER_PAGE,
	GET_DISCOUNTS_SELECT,
	DISCOUNTS_SORT_OPTIONS,
	DISCOUNTS_SORT_LABELS,
} from "../constants/discount.constants";
import { getDiscountsSchema, discountFiltersSchema, discountSortBySchema } from "../schemas/discount.schemas";
import type { GetDiscountsParams, GetDiscountsReturn } from "../types/discount.types";

// Re-export pour compatibilité
export {
	DISCOUNTS_SORT_LABELS,
	DISCOUNTS_SORT_OPTIONS,
	GET_DISCOUNTS_DEFAULT_PER_PAGE,
} from "../constants/discount.constants";
export { discountFiltersSchema, discountSortBySchema } from "../schemas/discount.schemas";
export type {
	Discount,
	DiscountFilters,
	GetDiscountsParams,
	GetDiscountsReturn,
} from "../types/discount.types";

// Aliases pour compatibilité
export { DISCOUNTS_SORT_LABELS as SORT_LABELS } from "../constants/discount.constants";
export { DISCOUNTS_SORT_OPTIONS as SORT_OPTIONS } from "../constants/discount.constants";

// ============================================================================
// QUERY BUILDER
// ============================================================================

function buildDiscountWhereClause(
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

	// Filtre par expiration
	if (params.filters?.isExpired !== undefined) {
		const now = new Date();
		if (params.filters.isExpired) {
			AND.push({ endsAt: { lt: now } });
		} else {
			AND.push({
				OR: [{ endsAt: null }, { endsAt: { gte: now } }],
			});
		}
	}

	if (AND.length > 0) {
		where.AND = AND;
	}

	return where;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des codes promo avec pagination
 */
export async function getDiscounts(
	params: GetDiscountsParams
): Promise<GetDiscountsReturn> {
	try {
		const validation = getDiscountsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters: " + JSON.stringify(validation.error.issues));
		}

		return fetchDiscounts(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}
		throw error;
	}
}

/**
 * Récupère les discounts depuis la DB avec cache
 */
async function fetchDiscounts(
	params: GetDiscountsParams
): Promise<GetDiscountsReturn> {
	"use cache";
	cacheDiscounts();

	try {
		const where = buildDiscountWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.DiscountOrderByWithRelationInput[] =
			params.sortBy.startsWith("code-")
				? [{ code: direction }, { id: "asc" }]
				: params.sortBy.startsWith("created-")
					? [{ createdAt: direction }, { id: "asc" }]
					: params.sortBy.startsWith("usage-")
						? [{ usageCount: direction }, { id: "asc" }]
						: params.sortBy.startsWith("ends-")
							? [{ endsAt: direction }, { id: "asc" }]
							: [{ createdAt: "desc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_DISCOUNTS_DEFAULT_PER_PAGE),
			GET_DISCOUNTS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const discounts = await prisma.discount.findMany({
			where,
			select: GET_DISCOUNTS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			discounts,
			take,
			params.direction,
			params.cursor
		);

		return { discounts: items, pagination };
	} catch (error) {
		const baseReturn = {
			discounts: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			error:
				process.env.NODE_ENV === "development"
					? error instanceof Error
						? error.message
						: "Unknown error"
					: "Failed to fetch discounts",
		};

		return baseReturn as GetDiscountsReturn & { error: string };
	}
}
