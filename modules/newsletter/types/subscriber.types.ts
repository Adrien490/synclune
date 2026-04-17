import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type GET_SUBSCRIBERS_SELECT } from "../constants/subscriber.constants";
import {
	type getSubscribersSchema,
	type subscriberFiltersSchema,
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
// TYPES - SUBSCRIBER LIST
// ============================================================================

export type SubscriberFilters = z.infer<typeof subscriberFiltersSchema>;

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
	isConfirmed: boolean;
};
