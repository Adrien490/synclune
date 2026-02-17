import { z } from "zod";
import { RefundReason, RefundStatus } from "@/app/generated/prisma/client";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
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

export const refundFiltersSchema = z.object({
	status: z
		.union([z.enum(RefundStatus), z.array(z.enum(RefundStatus))])
		.optional(),
	reason: z
		.union([z.enum(RefundReason), z.array(z.enum(RefundReason))])
		.optional(),
	orderId: z.cuid2().optional(),
	createdAfter: stringOrDateSchema,
	createdBefore: stringOrDateSchema,
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
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_REFUNDS_DEFAULT_PER_PAGE, GET_REFUNDS_MAX_RESULTS_PER_PAGE),
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
	amount: z
		.number()
		.int()
		.nonnegative("Le montant doit être positif ou nul")
		.max(999999999, "Montant trop élevé"),
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

// ============================================================================
// BULK APPROVE REFUNDS SCHEMA
// ============================================================================

export const bulkApproveRefundsSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins un remboursement doit être sélectionné").max(100, "Maximum 100 remboursements par opération"),
});

// ============================================================================
// BULK REJECT REFUNDS SCHEMA
// ============================================================================

export const bulkRejectRefundsSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins un remboursement doit être sélectionné").max(100, "Maximum 100 remboursements par opération"),
	reason: z.string().max(500).optional(),
});

// ============================================================================
// GET ORDER FOR REFUND SCHEMA
// ============================================================================

/**
 * Schema pour récupérer une commande avec les infos nécessaires pour créer un remboursement
 */
export const getOrderForRefundSchema = z.object({
	orderId: z.cuid2(),
});
