import type {
	OrderAction,
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";

/**
 * Paramètres pour créer une entrée d'audit
 */
export interface CreateOrderAuditParams {
	orderId: string;
	action: OrderAction;

	// Statuts avant/après (optionnels selon l'action)
	previousStatus?: OrderStatus;
	newStatus?: OrderStatus;
	previousPaymentStatus?: PaymentStatus;
	newPaymentStatus?: PaymentStatus;
	previousFulfillmentStatus?: FulfillmentStatus;
	newFulfillmentStatus?: FulfillmentStatus;

	// Note explicative
	note?: string;

	// Métadonnées additionnelles (JSON)
	metadata?: Record<string, unknown>;

	// Auteur de l'action
	authorId?: string;
	authorName?: string;

	// Source de l'action
	source?: "admin" | "webhook" | "system" | "customer";
}
