import type {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	InvoiceStatus,
} from "@/app/generated/prisma/enums";
import type { BadgeVariant } from "@/shared/types/badge.types";

// Re-export pour compatibilité
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

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
	PENDING: "Paiement en attente",
	PAID: "Payée",
	FAILED: "Échouée",
	EXPIRED: "Expirée",
	PARTIALLY_REFUNDED: "Partiellement remboursée",
	REFUNDED: "Remboursée",
};

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
	PENDING: "warning",
	PAID: "success",
	FAILED: "destructive",
	EXPIRED: "secondary",
	PARTIALLY_REFUNDED: "warning",
	REFUNDED: "secondary",
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
	UNFULFILLED: "Non traitée",
	PROCESSING: "En préparation",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	RETURNED: "Retournée",
};

export const FULFILLMENT_STATUS_VARIANTS: Record<FulfillmentStatus, BadgeVariant> = {
	UNFULFILLED: "outline",
	PROCESSING: "default",
	SHIPPED: "secondary",
	DELIVERED: "success",
	RETURNED: "destructive",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
	PENDING: "Non émise",
	GENERATED: "Émise",
	VOIDED: "Annulée (avoir)",
};

export const INVOICE_STATUS_VARIANTS: Record<InvoiceStatus, BadgeVariant> = {
	PENDING: "outline",
	GENERATED: "success",
	VOIDED: "warning",
};
