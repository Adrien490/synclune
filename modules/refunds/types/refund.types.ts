import { type Prisma, type RefundReason } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import {
	type GET_REFUND_SELECT,
	type GET_REFUNDS_SELECT,
	type GET_ORDER_FOR_REFUND_SELECT,
} from "../constants/refund.constants";
import {
	type getRefundSchema,
	type getRefundsSchema,
	type refundFiltersSchema,
	type createRefundSchema,
	type createRefundItemSchema,
	type approveRefundSchema,
	type processRefundSchema,
	type rejectRefundSchema,
	type cancelRefundSchema,
	type getOrderForRefundSchema,
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

export type GetRefundsParams = Omit<z.infer<typeof getRefundsSchema>, "direction"> & {
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

// ============================================================================
// ORDER FOR REFUND TYPES (from data/)
// ============================================================================

export type GetOrderForRefundParams = z.infer<typeof getOrderForRefundSchema>;

export type OrderForRefund = Prisma.OrderGetPayload<{
	select: typeof GET_ORDER_FOR_REFUND_SELECT;
}>;

export type OrderItemForRefund = OrderForRefund["items"][0];

// ============================================================================
// FORM TYPES
// ============================================================================

/** Valeur d'un item dans le formulaire de remboursement */
export interface RefundItemValue {
	orderItemId: string;
	quantity: number;
	restock: boolean;
	selected: boolean;
}

/** Valeurs du formulaire de création de remboursement */
export interface CreateRefundFormValues {
	orderId: string;
	reason: RefundReason;
	note: string;
	items: RefundItemValue[];
}
