import { prisma, notDeleted } from "@/shared/lib/prisma";
import {
	buildCursorPagination,
	processCursorResults,
	DEFAULT_PER_PAGE,
} from "@/shared/lib/pagination";

import { isAdmin } from "@/modules/auth/utils/guards";

import { cacheCustomizationList } from "../constants/cache";
import { SORT_OPTIONS } from "../constants/sort.constants";
import type {
	GetCustomizationRequestsParams,
	GetCustomizationRequestsResult,
} from "../types/customization.types";

// Re-export types for consumers
export type { GetCustomizationRequestsResult };

const MAX_RESULTS_PER_PAGE = 200;

// ============================================================================
// DATA FUNCTION
// ============================================================================

export async function getCustomizationRequests(params: GetCustomizationRequestsParams = {}): Promise<GetCustomizationRequestsResult> {
	const admin = await isAdmin();
	if (!admin) return { items: [], pagination: { nextCursor: null, prevCursor: null, hasNextPage: false, hasPreviousPage: false } };

	return fetchCustomizationRequests(params);
}

async function fetchCustomizationRequests({
	cursor,
	direction = "forward",
	perPage = DEFAULT_PER_PAGE,
	sortBy = SORT_OPTIONS.CREATED_DESC,
	filters,
}: GetCustomizationRequestsParams = {}): Promise<GetCustomizationRequestsResult> {
	"use cache";
	cacheCustomizationList();

	try {
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
			sortBy === SORT_OPTIONS.CREATED_ASC
				? { createdAt: "asc" as const }
				: sortBy === SORT_OPTIONS.STATUS_ASC
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
	} catch (error) {
		console.error("[GET_CUSTOMIZATION_REQUESTS]", error);
		return {
			items: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}
}
