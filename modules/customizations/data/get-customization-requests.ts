import { prisma, notDeleted } from "@/shared/lib/prisma";
import {
	buildCursorPagination,
	processCursorResults,
	DEFAULT_PER_PAGE,
} from "@/shared/components/cursor-pagination/pagination";

import { cacheCustomizationList } from "../constants/cache";
import type {
	GetCustomizationRequestsParams,
	GetCustomizationRequestsResult,
} from "../types/customization.types";

// Re-export types for consumers
export type { GetCustomizationRequestsResult };

const MAX_RESULTS_PER_PAGE = 200;

// ============================================================================
// SORT OPTIONS
// ============================================================================

export const CUSTOMIZATION_SORT_OPTIONS = {
	RECENT: "recent",
	OLDEST: "oldest",
	STATUS: "status",
} as const;

// ============================================================================
// DATA FUNCTION
// ============================================================================

export async function getCustomizationRequests({
	cursor,
	direction = "forward",
	perPage = DEFAULT_PER_PAGE,
	sortBy = CUSTOMIZATION_SORT_OPTIONS.RECENT,
	filters,
}: GetCustomizationRequestsParams = {}): Promise<GetCustomizationRequestsResult> {
	"use cache";
	cacheCustomizationList();

	// Build where clause
	const where = {
		...notDeleted,
		...(filters?.status && { status: filters.status }),
		...(filters?.search && {
			OR: [
				{ firstName: { contains: filters.search, mode: "insensitive" as const } },
				{ email: { contains: filters.search, mode: "insensitive" as const } },
			],
		}),
	};

	// Build orderBy
	const orderBy =
		sortBy === CUSTOMIZATION_SORT_OPTIONS.OLDEST
			? { createdAt: "asc" as const }
			: sortBy === CUSTOMIZATION_SORT_OPTIONS.STATUS
				? [{ status: "asc" as const }, { createdAt: "desc" as const }]
				: { createdAt: "desc" as const };

	// Validate and constrain perPage
	const take = Math.min(Math.max(1, perPage), MAX_RESULTS_PER_PAGE);

	// Build cursor config using shared helper
	const cursorConfig = buildCursorPagination({
		cursor,
		direction,
		take,
	});

	const items = await prisma.customizationRequest.findMany({
		where,
		orderBy,
		...cursorConfig,
		select: {
			id: true,
			createdAt: true,
			firstName: true,
			email: true,
			phone: true,
			productTypeLabel: true,
			status: true,
			adminNotes: true,
			respondedAt: true,
			_count: {
				select: {
					inspirationProducts: true,
				},
			},
		},
	});

	// Process results using shared helper
	return processCursorResults(items, take, direction, cursor);
}
