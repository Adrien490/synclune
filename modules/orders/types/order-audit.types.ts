import type {
	OrderAction,
	OrderStatus,
	PaymentStatus,
	HistorySource,
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

	// Note explicative
	note?: string;

	// Métadonnées additionnelles (JSON)
	metadata?: Record<string, unknown>;

	// Auteur de l'action. Pas d'`authorId` : cf. commentaire du modèle
	// `OrderHistory` dans `prisma/schema.prisma` (colonne write-only retirée).
	authorName?: string;

	// Source de l'action
	source?: HistorySource;
}
