/**
 * Utilitaires pour la gestion des permissions et états des commandes
 * Centralise la logique de state machine pour les commandes
 */

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";

interface OrderStateInput {
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus?: FulfillmentStatus | null;
	trackingNumber?: string | null;
}

interface OrderPermissions {
	canRefund: boolean;
	canUpdateTracking: boolean;
	canMarkAsShipped: boolean;
	canMarkAsDelivered: boolean;
	canMarkAsProcessing: boolean;
	canMarkAsPaid: boolean;
	canCancel: boolean;
	canRevertToProcessing: boolean;
}

/**
 * Calcule les permissions disponibles pour une commande
 * basées sur son état actuel (status, paymentStatus, fulfillmentStatus)
 */
export function getOrderPermissions(order: OrderStateInput): OrderPermissions {
	const isPending = order.status === OrderStatus.PENDING;
	const isProcessing = order.status === OrderStatus.PROCESSING;
	const isShipped = order.status === OrderStatus.SHIPPED;
	const isDelivered = order.status === OrderStatus.DELIVERED;
	const isCancelled = order.status === OrderStatus.CANCELLED;
	const isReturned =
		order.fulfillmentStatus === FulfillmentStatus.RETURNED;

	const isPaid = order.paymentStatus === PaymentStatus.PAID;
	const isPaymentPending = order.paymentStatus === PaymentStatus.PENDING;
	const hasTrackingNumber = !!order.trackingNumber;

	return {
		// Remboursement possible si payé et pas annulé/retourné
		canRefund: (isProcessing || isShipped || isDelivered) && isPaid,

		// Mise à jour du suivi possible si expédié/livré avec numéro de suivi
		canUpdateTracking: (isShipped || isDelivered) && hasTrackingNumber,

		// Expédition possible si en traitement et payé
		canMarkAsShipped: isProcessing && isPaid,

		// Livraison possible si expédié
		canMarkAsDelivered: isShipped,

		// Passage en traitement possible si en attente et payé
		canMarkAsProcessing: isPending && isPaid,

		// Marquage comme payé possible si paiement en attente
		canMarkAsPaid: isPaymentPending && (isPending || isProcessing),

		// Annulation possible si pas encore expédié
		canCancel: (isPending || isProcessing) && !isCancelled,

		// Retour en traitement possible si expédié
		canRevertToProcessing: isShipped,
	};
}

/**
 * Vérifie si une commande peut être remboursée
 */
export function canRefundOrder(order: OrderStateInput): boolean {
	return getOrderPermissions(order).canRefund;
}

/**
 * Vérifie si le suivi peut être mis à jour
 */
export function canUpdateOrderTracking(order: OrderStateInput): boolean {
	return getOrderPermissions(order).canUpdateTracking;
}
