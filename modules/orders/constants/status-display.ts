import type {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	InvoiceStatus,
} from "@/app/generated/prisma/enums";
import type { BadgeVariant } from "@/shared/types/badge.types";

// SSOT de l'affichage des statuts commande (labels + variants Badge).
// Le module dashboard ré-exporte depuis ici — ne pas redéclarer ailleurs.
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

// « À préparer » + warning (et non « Non traitée » + outline) : une commande
// payée non préparée est une tâche en attente, pas un état neutre — décision
// audit UI design system 2026-08-01, alignée sur le dashboard.
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
