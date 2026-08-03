import { type Prisma, type RefundReason } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type GET_REFUND_SELECT, type GET_REFUNDS_SELECT } from "../constants/refund.constants";
import {
	type getRefundSchema,
	type getRefundsSchema,
	type refundFiltersSchema,
} from "../schemas/refund.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type RefundFilters = z.infer<typeof refundFiltersSchema>;

// ============================================================================
// ENTITY TYPES
// ============================================================================

type Refund = Prisma.RefundGetPayload<{
	select: typeof GET_REFUNDS_SELECT;
}>;

type RefundDetail = Prisma.RefundGetPayload<{
	select: typeof GET_REFUND_SELECT;
}>;

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
	totalCount: number;
};

// Les types du formulaire de création (RefundItemValue, CreateRefundFormValues)
// sont partis au Lot 2 S3.3 avec le formulaire lui-même.
