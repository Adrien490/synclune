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

// ============================================================================
// FORM TYPES
// ============================================================================

/** Valeur d'un item dans le formulaire de remboursement */
export interface RefundItemValue {
	orderItemId: string;
	quantity: number;
	restock: boolean;
	selected: boolean;
	/**
	 * UI-only : `true` quand l'admin a basculé manuellement le restock de ce
	 * bijou. Empêche un changement de motif d'écraser l'override. Non transmis
	 * à la server action (cf. `formatItemsForAction`).
	 */
	restockTouched?: boolean;
}

/** Valeurs du formulaire de création de remboursement */
export interface CreateRefundFormValues {
	orderId: string;
	reason: RefundReason;
	note: string;
	items: RefundItemValue[];
	/** ORD-REFUND-AUDIT-003 : confirmation pour refund sur commande annulée */
	acceptCancelledOrder: boolean;
}
