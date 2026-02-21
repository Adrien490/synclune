import { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/client";
import type { BadgeVariant } from "@/shared/types/badge.types";

// Re-export pour compatibilité
export type { BadgeVariant };

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	PENDING: "En attente",
	PROCESSING: "En traitement",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	CANCELLED: "Annulée",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
	PENDING: "#f59e0b", // yellow-500
	PROCESSING: "#3b82f6", // blue-500
	SHIPPED: "#a855f7", // purple-500
	DELIVERED: "#10b981", // green-500
	CANCELLED: "#ef4444", // red-500
};

export const ORDER_STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
	PENDING: "warning",
	PROCESSING: "default",
	SHIPPED: "secondary",
	DELIVERED: "success",
	CANCELLED: "destructive",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
	PENDING: "En attente",
	PAID: "Payée",
	FAILED: "Échouée",
	EXPIRED: "Expirée",
	PARTIALLY_REFUNDED: "Partiellement remboursée",
	REFUNDED: "Remboursée",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
	PENDING: "#f59e0b", // yellow-500
	PAID: "#10b981", // green-500
	FAILED: "#ef4444", // red-500
	EXPIRED: "#6b7280", // gray-500
	PARTIALLY_REFUNDED: "#f97316", // orange-500
	REFUNDED: "#6b7280", // gray-500
};

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
	PENDING: "warning",
	PAID: "success",
	FAILED: "destructive",
	EXPIRED: "secondary",
	PARTIALLY_REFUNDED: "warning",
	REFUNDED: "secondary",
};

export const SHIPPING_ZONE_LABELS: Record<string, string> = {
	METROPOLITAN: "FR",
	CORSE: "CORSE",
	DOM: "DOM",
	TOM: "TOM",
	UNKNOWN: "—",
};

export const SHIPPING_ZONE_COLORS: Record<string, string> = {
	METROPOLITAN: "#3b82f6", // blue-500
	CORSE: "#f59e0b", // yellow-500
	DOM: "#10b981", // green-500
	TOM: "#a855f7", // purple-500
	UNKNOWN: "#6b7280", // gray-500
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
	UNFULFILLED: "Non traitée",
	PROCESSING: "En préparation",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	RETURNED: "Retournée",
};

export const FULFILLMENT_STATUS_COLORS: Record<FulfillmentStatus, string> = {
	UNFULFILLED: "#6b7280", // gray-500
	PROCESSING: "#3b82f6", // blue-500
	SHIPPED: "#a855f7", // purple-500
	DELIVERED: "#10b981", // green-500
	RETURNED: "#ef4444", // red-500
};

export const FULFILLMENT_STATUS_VARIANTS: Record<FulfillmentStatus, BadgeVariant> = {
	UNFULFILLED: "outline",
	PROCESSING: "default",
	SHIPPED: "secondary",
	DELIVERED: "success",
	RETURNED: "destructive",
};

// Micro-entreprise : exonération de TVA (art. 293 B du CGI)
export const VAT_EXEMPTION_TEXT = "TVA non applicable, article 293 B du CGI";