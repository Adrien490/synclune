import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import {
	GET_SUBSCRIBERS_SELECT,
	GET_SUBSCRIBERS_DEFAULT_PER_PAGE,
	GET_SUBSCRIBERS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
	SORT_LABELS,
} from "../constants/subscriber.constants";
import {
	getSubscribersSchema,
	subscriberFiltersSchema,
	subscriberSortBySchema,
} from "../schemas/subscriber.schemas";
import type {
	GetSubscribersParams,
	GetSubscribersReturn,
	Subscriber,
} from "../types/subscriber.types";
import { buildSubscriberWhereClause } from "../utils/subscriber-query-builder";

// Re-export pour compatibilité
export {
	GET_SUBSCRIBERS_SELECT,
	SORT_OPTIONS,
	GET_SUBSCRIBERS_DEFAULT_PER_PAGE,
	SORT_LABELS,
} from "../constants/subscriber.constants";
export const GET_SUBSCRIBERS_SORT_FIELDS = Object.values(SORT_OPTIONS);
export {
	getSubscribersSchema,
	subscriberFiltersSchema,
	subscriberSortBySchema,
} from "../schemas/subscriber.schemas";
export type {
	GetSubscribersParams,
	GetSubscribersReturn,
	SubscriberFilters,
	Subscriber,
} from "../types/subscriber.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Server action to get newsletter subscribers
 */
export async function getSubscribers(
	params: GetSubscribersParams
): Promise<GetSubscribersReturn> {
	try {
		const validation = getSubscribersSchema.safeParse(params);

		if (!validation.success) {
			throw new Error(
				"Invalid parameters: " + JSON.stringify(validation.error.issues)
			);
		}

		return await fetchSubscribers(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}

/**
 * Récupère les abonnés newsletter depuis la DB avec cache
 */
export async function fetchSubscribers(
	params: GetSubscribersParams
): Promise<GetSubscribersReturn> {
	"use cache";
	cacheDashboard();

	try {
		const where = buildSubscriberWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.NewsletterSubscriberOrderByWithRelationInput[] =
			params.sortBy.startsWith("subscribed-")
				? [{ subscribedAt: direction }, { id: "asc" }]
				: params.sortBy.startsWith("email-")
					? [{ email: direction }, { id: "asc" }]
					: params.sortBy.startsWith("status-")
						? [{ isActive: direction }, { id: "asc" }]
						: [{ subscribedAt: "desc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_SUBSCRIBERS_DEFAULT_PER_PAGE),
			GET_SUBSCRIBERS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const subscribers = await prisma.newsletterSubscriber.findMany({
			where,
			select: GET_SUBSCRIBERS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			subscribers,
			take,
			params.direction,
			params.cursor
		);

		return {
			subscribers: items,
			pagination,
		};
	} catch (error) {
		const baseReturn = {
			subscribers: [],
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
					: "Failed to fetch subscribers",
		};

		return baseReturn as GetSubscribersReturn & { error: string };
	}
}
