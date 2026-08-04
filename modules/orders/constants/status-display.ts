import type { OrderStatus, PaymentStatus, InvoiceStatus } from "@/app/generated/prisma/enums";
import type { BadgeVariant } from "@/shared/types/badge.types";

// SSOT de l'affichage des statuts commande (labels + variants Badge).
// Le module dashboard ré-exporte depuis ici — ne pas redéclarer ailleurs.
// Table unique depuis la fusion de `FulfillmentStatus` dans `OrderStatus` (audit
// V2, Lot 4) : le détail commande affichait DEUX badges pour un même avancement.
//
// `PENDING` garde `warning` — la décision de l'audit UI design system 2026-08-01
// (« une commande payée non préparée est une tâche en attente, pas un état
// neutre ») portait sur `UNFULFILLED`, dont `PENDING` est l'équivalent exact.
//
// ⚠️ Un libellé a été ARBITRÉ, pas dérivé : `PROCESSING` prend « En préparation »
// (ex-`FULFILLMENT_STATUS_LABELS`) et non « En traitement » (ex-`ORDER_STATUS_LABELS`).
// C'est le mot du bouton que Léane clique (« Passer en préparation »).
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	PENDING: "En attente",
	PROCESSING: "En préparation",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	RETURNED: "Retournée",
	CANCELLED: "Annulée",
};

export const ORDER_STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
	PENDING: "warning",
	PROCESSING: "default",
	SHIPPED: "secondary",
	DELIVERED: "success",
	RETURNED: "destructive",
	CANCELLED: "destructive",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
	PENDING: "Paiement en attente",
	PAID: "Payée",
	FAILED: "Échouée",
	PARTIALLY_REFUNDED: "Partiellement remboursée",
	REFUNDED: "Remboursée",
};

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
	PENDING: "warning",
	PAID: "success",
	FAILED: "destructive",
	PARTIALLY_REFUNDED: "warning",
	REFUNDED: "secondary",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
	GENERATED: "Émise",
	VOIDED: "Annulée (avoir)",
};

export const INVOICE_STATUS_VARIANTS: Record<InvoiceStatus, BadgeVariant> = {
	GENERATED: "success",
	VOIDED: "warning",
};
