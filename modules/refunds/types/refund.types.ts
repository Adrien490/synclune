import { Prisma } from "@/app/generated/prisma";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_REFUND_SELECT,
	GET_REFUNDS_SELECT,
} from "../constants/refund.constants";
import {
	getRefundSchema,
	getRefundsSchema,
	refundFiltersSchema,
	createRefundSchema,
	createRefundItemSchema,
	approveRefundSchema,
	processRefundSchema,
	rejectRefundSchema,
	cancelRefundSchema,
} from "../schemas/refund.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type RefundFilters = z.infer<typeof refundFiltersSchema>;

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type Refund = Prisma.RefundGetPayload<{
	select: typeof GET_REFUNDS_SELECT;
}>;

export type RefundDetail = Prisma.RefundGetPayload<{
	select: typeof GET_REFUND_SELECT;
}>;

export type RefundItem = RefundDetail["items"][0];

// ============================================================================
// FUNCTION TYPES - SINGLE
// ============================================================================

export type GetRefundParams = z.infer<typeof getRefundSchema>;
export type GetRefundReturn = RefundDetail | null;

// ============================================================================
// FUNCTION TYPES - LIST
// ============================================================================

export type GetRefundsParams = Omit<
	z.infer<typeof getRefundsSchema>,
	"direction"
> & {
	direction?: "forward" | "backward";
};

export type GetRefundsReturn = {
	refunds: Refund[];
	pagination: PaginationInfo;
};

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type CreateRefundItemInput = z.infer<typeof createRefundItemSchema>;
export type ApproveRefundInput = z.infer<typeof approveRefundSchema>;
export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
export type RejectRefundInput = z.infer<typeof rejectRefundSchema>;
export type CancelRefundInput = z.infer<typeof cancelRefundSchema>;
