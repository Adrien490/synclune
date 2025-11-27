import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";

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

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
	PENDING: "En attente",
	PAID: "Payée",
	FAILED: "Échouée",
	REFUNDED: "Remboursée",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
	PENDING: "#f59e0b", // yellow-500
	PAID: "#10b981", // green-500
	FAILED: "#ef4444", // red-500
	REFUNDED: "#6b7280", // gray-500
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