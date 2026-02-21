import type { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";

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

export const ORDER_STATUS_VARIANTS: Record<
	OrderStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	PENDING: "outline",
	PROCESSING: "secondary",
	SHIPPED: "default",
	DELIVERED: "default",
	CANCELLED: "destructive",
};

// ============================================================================
// PAYMENT STATUS
// ============================================================================

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
	PENDING: "En attente",
	PAID: "Payée",
	FAILED: "Échouée",
	EXPIRED: "Expirée",
	REFUNDED: "Remboursée",
	PARTIALLY_REFUNDED: "Part. remboursée",
};
