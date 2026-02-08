import { z } from "zod";
import { NewsletterStatus } from "@/app/generated/prisma/client";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { stringOrDateSchema } from "@/shared/schemas/date.schemas";
import { createPerPageSchema } from "@/shared/utils/pagination";
import { SORT_OPTIONS } from "../constants/subscriber.constants";

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

// Valeurs enum Prisma (lowercase via @map)
const newsletterStatusValues = Object.values(NewsletterStatus) as [string, ...string[]];

export const subscriberFiltersSchema = z
	.object({
		status: z
			.enum(newsletterStatusValues)
			.optional(),
		subscribedAfter: stringOrDateSchema,
		subscribedBefore: stringOrDateSchema,
	})
	.refine((data) => {
		if (data.subscribedAfter && data.subscribedBefore) {
			return data.subscribedAfter <= data.subscribedBefore;
		}
		return true;
	}, "subscribedAfter must be before or equal to subscribedBefore");

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const subscriberSortBySchema = z.enum([
	SORT_OPTIONS.SUBSCRIBED_DESC,
	SORT_OPTIONS.SUBSCRIBED_ASC,
	SORT_OPTIONS.EMAIL_ASC,
	SORT_OPTIONS.EMAIL_DESC,
	SORT_OPTIONS.STATUS_ASC,
	SORT_OPTIONS.STATUS_DESC,
]);

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getSubscribersSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(20, 100),
	sortBy: subscriberSortBySchema,
	search: z.string().max(255).optional(),
	filters: subscriberFiltersSchema.optional(),
});

