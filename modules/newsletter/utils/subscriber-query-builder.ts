import { Prisma } from "@/app/generated/prisma/client";
import type {
	GetSubscribersParams,
	SubscriberFilters,
} from "../types/subscriber.types";

// ============================================================================
// SUBSCRIBER QUERY BUILDER UTILS
// ============================================================================

export function buildSubscriberSearchConditions(
	search: string
): Prisma.NewsletterSubscriberWhereInput | null {
	const trimmedSearch = search.trim();

	if (!trimmedSearch) {
		return null;
	}

	return {
		email: {
			contains: trimmedSearch,
			mode: Prisma.QueryMode.insensitive,
		},
	};
}

export function buildSubscriberFilterConditions(
	filters: SubscriberFilters
): Prisma.NewsletterSubscriberWhereInput {
	const conditions: Prisma.NewsletterSubscriberWhereInput = {};

	if (filters.isActive !== undefined) {
		conditions.isActive = filters.isActive;
	}

	if (filters.subscribedAfter || filters.subscribedBefore) {
		conditions.subscribedAt = {};
		if (filters.subscribedAfter) {
			conditions.subscribedAt.gte = filters.subscribedAfter;
		}
		if (filters.subscribedBefore) {
			conditions.subscribedAt.lte = filters.subscribedBefore;
		}
	}

	return conditions;
}

export function buildSubscriberWhereClause(
	params: GetSubscribersParams
): Prisma.NewsletterSubscriberWhereInput {
	const whereClause: Prisma.NewsletterSubscriberWhereInput = {};
	const andConditions: Prisma.NewsletterSubscriberWhereInput[] = [];

	if (params.filters) {
		const filterConditions = buildSubscriberFilterConditions(params.filters);
		andConditions.push(filterConditions);
	}

	if (params.search) {
		const searchConditions = buildSubscriberSearchConditions(params.search);
		if (searchConditions) {
			andConditions.push(searchConditions);
		}
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
