import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { z } from "zod";
import { RefundReason, RefundStatus } from "@/app/generated/prisma/client";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { stringOrDateSchema } from "@/shared/schemas/date.schemas";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_REFUNDS_DEFAULT_PER_PAGE,
	GET_REFUNDS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
} from "../constants/refund.constants";

// ============================================================================
// GET SINGLE SCHEMA
// ============================================================================

export const getRefundSchema = z.object({
	id: z.cuid2(),
});

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const refundFiltersSchema = z
	.object({
		status: z.union([z.enum(RefundStatus), z.array(z.enum(RefundStatus))]).optional(),
		reason: z.union([z.enum(RefundReason), z.array(z.enum(RefundReason))]).optional(),
		orderId: z.cuid2().optional(),
		createdAfter: stringOrDateSchema,
		createdBefore: stringOrDateSchema,
	})
	.refine(
		(data) => {
			if (data.createdAfter && data.createdBefore) {
				return new Date(data.createdAfter) <= new Date(data.createdBefore);
			}
			return true;
		},
		{
			message: "La date de début doit être antérieure à la date de fin",
			path: ["createdAfter"],
		},
	);

// ============================================================================
// SORT SCHEMA
// ============================================================================

const refundSortBySchema = z
	.enum([
		SORT_OPTIONS.CREATED_DESC,
		SORT_OPTIONS.CREATED_ASC,
		SORT_OPTIONS.AMOUNT_DESC,
		SORT_OPTIONS.AMOUNT_ASC,
		SORT_OPTIONS.STATUS_ASC,
		SORT_OPTIONS.STATUS_DESC,
	])
	.default(SORT_OPTIONS.CREATED_DESC);

// ============================================================================
// GET LIST SCHEMA
// ============================================================================

export const getRefundsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_REFUNDS_DEFAULT_PER_PAGE, GET_REFUNDS_MAX_RESULTS_PER_PAGE),
	sortBy: refundSortBySchema,
	search: z.string().max(TEXT_LIMITS.SEARCH.max).optional(),
	filters: refundFiltersSchema.optional(),
});

// Les schémas du workflow in-app (create/approve/process/reject/cancel/retry,
// getOrderForRefund) sont partis au Lot 2 (SIMPLIFICATION.md S3.3) : les
// remboursements se créent dans le dashboard Stripe, la synchro webhook
// (`charge.refunded` → upsert) alimente les lignes Refund lues ici.
