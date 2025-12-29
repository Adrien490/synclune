import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_SUBSCRIBER_SELECT,
	GET_SUBSCRIBERS_SELECT,
	GET_SUBSCRIBERS_SORT_FIELDS,
} from "../constants/subscriber.constants";
import {
	getSubscribersSchema,
	subscriberFiltersSchema,
} from "../schemas/subscriber.schemas";

// ============================================================================
// TYPES - NEWSLETTER STATS
// ============================================================================

/** Statistiques de la newsletter pour le dashboard admin */
export interface NewsletterStats {
	totalSubscribers: number;
	activeSubscribers: number;
	inactiveSubscribers: number;
}

// ============================================================================
// TYPES - SINGLE SUBSCRIBER
// ============================================================================

export type Subscriber = Prisma.NewsletterSubscriberGetPayload<{
	select: typeof GET_SUBSCRIBER_SELECT;
}>;

// ============================================================================
// TYPES - SUBSCRIBER LIST
// ============================================================================

export type SubscriberFilters = z.infer<typeof subscriberFiltersSchema>;

export type SubscriberSortField = (typeof GET_SUBSCRIBERS_SORT_FIELDS)[number];

export type GetSubscribersParams = z.infer<typeof getSubscribersSchema>;

export type GetSubscribersReturn = {
	subscribers: Array<
		Prisma.NewsletterSubscriberGetPayload<{
			select: typeof GET_SUBSCRIBERS_SELECT;
		}>
	>;
	pagination: PaginationInfo;
};

// ============================================================================
// TYPES - NEWSLETTER STATUS
// ============================================================================

/**
 * Return type for getSubscriptionStatus - user-facing status check
 */
export type GetSubscriptionStatusReturn = {
	isSubscribed: boolean;
	email: string | null;
	emailVerified: boolean;
};
