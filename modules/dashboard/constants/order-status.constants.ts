import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import type { BadgeVariant } from "@/shared/types/badge.types";

// ============================================================================
// ORDER STATUS
// ============================================================================

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	PENDING: "En attente",
	PROCESSING: "En traitement",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	CANCELLED: "Annulée",
};

export const ORDER_STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
	PENDING: "warning",
	PROCESSING: "default",
	SHIPPED: "secondary",
	DELIVERED: "success",
	CANCELLED: "destructive",
};

// ============================================================================
// PAYMENT STATUS
// ============================================================================

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
	PENDING: "En attente",
	PAID: "Payée",
	FAILED: "Échouée",
	EXPIRED: "Expirée",
	REFUNDED: "Remboursée",
	PARTIALLY_REFUNDED: "Part. remboursée",
};

// ============================================================================
// FULFILLMENT STATUS
// ============================================================================

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
	UNFULFILLED: "À préparer",
	PROCESSING: "En préparation",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	RETURNED: "Retournée",
};

export const FULFILLMENT_STATUS_VARIANTS: Record<FulfillmentStatus, BadgeVariant> = {
	UNFULFILLED: "warning",
	PROCESSING: "default",
	SHIPPED: "secondary",
	DELIVERED: "success",
	RETURNED: "destructive",
};
