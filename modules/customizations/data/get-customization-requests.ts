import { prisma, notDeleted } from "@/shared/lib/prisma";

import { cacheCustomizationList } from "../constants/cache";
import type {
	GetCustomizationRequestsParams,
	GetCustomizationRequestsResult,
} from "../types";

// Re-export types for consumers
export type { GetCustomizationRequestsResult };

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
	perPage = 50,
	sortBy = CUSTOMIZATION_SORT_OPTIONS.RECENT,
	filters,
}: GetCustomizationRequestsParams = {}): Promise<GetCustomizationRequestsResult> {
	"use cache: remote";
	cacheCustomizationList();

	// Build where clause
	const where = {
		...notDeleted,
		...(filters?.status && { status: filters.status }),
		...(filters?.search && {
			OR: [
				{ firstName: { contains: filters.search, mode: "insensitive" as const } },
				{ lastName: { contains: filters.search, mode: "insensitive" as const } },
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

	// Cursor pagination
	const cursorObj = cursor ? { id: cursor } : undefined;
	const take = direction === "forward" ? perPage + 1 : -(perPage + 1);
	const skip = cursor ? 1 : 0;

	const [items, total] = await Promise.all([
		prisma.customizationRequest.findMany({
			where,
			orderBy,
			cursor: cursorObj,
			take,
			skip,
			select: {
				id: true,
				createdAt: true,
				firstName: true,
				lastName: true,
				email: true,
				phone: true,
				productTypeLabel: true,
				status: true,
				adminNotes: true,
				respondedAt: true,
				_count: {
					select: {
						inspirationProducts: true,
						preferredColors: true,
						preferredMaterials: true,
					},
				},
			},
		}),
		prisma.customizationRequest.count({ where }),
	]);

	// Handle pagination
	const hasMore = items.length > perPage;
	if (hasMore) {
		if (direction === "forward") {
			items.pop();
		} else {
			items.shift();
		}
	}

	// Reverse if backward
	if (direction === "backward") {
		items.reverse();
	}

	return {
		items,
		hasMore,
		nextCursor: items.length > 0 ? items[items.length - 1].id : null,
		prevCursor: items.length > 0 ? items[0].id : null,
		total,
	};
}
