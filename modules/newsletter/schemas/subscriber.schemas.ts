import { z } from "zod";
import { NewsletterStatus } from "@/app/generated/prisma";
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
		subscribedAfter: z
			.union([z.string(), z.date()])
			.transform((val) => {
				if (val instanceof Date) return val;
				if (typeof val === "string") {
					const date = new Date(val);
					return isNaN(date.getTime()) ? undefined : date;
				}
				return undefined;
			})
			.optional(),
		subscribedBefore: z
			.union([z.string(), z.date()])
			.transform((val) => {
				if (val instanceof Date) return val;
				if (typeof val === "string") {
					const date = new Date(val);
					return isNaN(date.getTime()) ? undefined : date;
				}
				return undefined;
			})
			.optional(),
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
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int({ message: "PerPage must be an integer" })
		.min(1, { message: "PerPage must be at least 1" })
		.max(100, "PerPage cannot exceed 100")
		.default(20),
	sortBy: subscriberSortBySchema,
	search: z.string().max(255).optional(),
	filters: subscriberFiltersSchema.optional(),
});

// ============================================================================
// SINGLE ADMIN ACTION SCHEMA
// ============================================================================

export const subscriberIdSchema = z.object({
	subscriberId: z.string().cuid2("ID d'abonné invalide"),
});

// ============================================================================
// BULK ADMIN SCHEMAS
// ============================================================================

export const bulkUnsubscribeSubscribersSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins un abonné doit être sélectionné"),
});

export const bulkResubscribeSubscribersSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins un abonné doit être sélectionné"),
});

export const bulkDeleteSubscribersSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins un abonné doit être sélectionné"),
});
