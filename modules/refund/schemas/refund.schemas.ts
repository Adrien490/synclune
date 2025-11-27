import { z } from "zod";
import { RefundReason, RefundStatus } from "@/app/generated/prisma/client";
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

export const refundFiltersSchema = z.object({
	status: z
		.union([z.enum(RefundStatus), z.array(z.enum(RefundStatus))])
		.optional(),
	reason: z
		.union([z.enum(RefundReason), z.array(z.enum(RefundReason))])
		.optional(),
	orderId: z.cuid2().optional(),
	createdAfter: z
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
	createdBefore: z
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
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const refundSortBySchema = z
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
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int()
		.min(1)
		.max(GET_REFUNDS_MAX_RESULTS_PER_PAGE)
		.default(GET_REFUNDS_DEFAULT_PER_PAGE),
	sortBy: refundSortBySchema,
	search: z.string().max(255).optional(),
	filters: refundFiltersSchema.optional(),
});

// ============================================================================
// CREATE REFUND ITEM SCHEMA
// ============================================================================

export const createRefundItemSchema = z.object({
	orderItemId: z.cuid2(),
	quantity: z.number().int().positive("La quantité doit être positive"),
	amount: z.number().int().nonnegative("Le montant doit être positif ou nul"),
	restock: z.boolean().default(true),
});

// ============================================================================
// CREATE REFUND SCHEMA
// ============================================================================

export const createRefundSchema = z.object({
	orderId: z.cuid2(),
	reason: z.enum(RefundReason),
	note: z.string().max(2000).optional(),
	items: z
		.array(createRefundItemSchema)
		.min(1, "Au moins un article doit être sélectionné"),
});

// ============================================================================
// UPDATE REFUND STATUS SCHEMA
// ============================================================================

export const updateRefundStatusSchema = z.object({
	id: z.cuid2(),
	status: z.enum(RefundStatus),
});

// ============================================================================
// APPROVE REFUND SCHEMA
// ============================================================================

export const approveRefundSchema = z.object({
	id: z.cuid2(),
});

// ============================================================================
// PROCESS REFUND SCHEMA
// ============================================================================

export const processRefundSchema = z.object({
	id: z.cuid2(),
});

// ============================================================================
// REJECT REFUND SCHEMA
// ============================================================================

export const rejectRefundSchema = z.object({
	id: z.cuid2(),
	reason: z.string().max(500).optional(),
});

// ============================================================================
// CANCEL REFUND SCHEMA
// ============================================================================

export const cancelRefundSchema = z.object({
	id: z.cuid2(),
});
