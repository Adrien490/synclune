/**
 * Service de validation des statuts de commande
 *
 * Ce module contient les fonctions pures pour :
 * - Valider les transitions de statut
 * - Vérifier si une commande peut être expédiée
 * - Vérifier si une commande peut être annulée
 * - Calculer les permissions disponibles selon l'état
 */

import { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/browser";

import type {
	OrderForShipValidation,
	ShipValidationResult,
	OrderStateInput,
	OrderPermissions,
	DeliveryValidationResult,
	ReturnValidationResult,
	ProcessingValidationResult,
	RevertValidationResult,
} from "../types/order.types";

export type {
	OrderForShipValidation,
	ShipValidationResult,
	ShipBlockReason,
	OrderStateInput,
	OrderPermissions,
	DeliveryValidationResult,
	DeliveryBlockReason,
	ReturnValidationResult,
	ReturnBlockReason,
	ProcessingValidationResult,
	ProcessingBlockReason,
	RevertValidationResult,
	RevertBlockReason,
} from "../types/order.types";

// ============================================================================
// ORDER STATUS VALIDATION SERVICE
// Pure functions for validating order status transitions
// ============================================================================

/**
 * Vérifie si une commande peut être marquée comme expédiée
 *
 * Règles :
 * - La commande ne doit pas être déjà expédiée ou livrée
 * - La commande ne doit pas être annulée
 * - La commande doit être payée
 *
 * @param order - Commande à valider
 * @returns Résultat de validation
 */
export function canMarkAsShipped(order: OrderForShipValidation): ShipValidationResult {
	// Vérifier si déjà expédiée/livrée
	if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
		return { canShip: false, reason: "already_shipped" };
	}

	// Vérifier si annulée
	if (order.status === OrderStatus.CANCELLED) {
		return { canShip: false, reason: "cancelled" };
	}

	// Vérifier si payée (PARTIALLY_REFUNDED = still has funds to fulfill remaining items)
	if (
		order.paymentStatus !== PaymentStatus.PAID &&
		order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
	) {
		return { canShip: false, reason: "unpaid" };
	}

	return { canShip: true };
}

/**
 * Vérifie si une commande est dans un état final (non modifiable)
 *
 * @param status - Statut de la commande
 * @returns true si la commande est dans un état final
 */
export function isOrderInFinalState(status: OrderStatus): boolean {
	return status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;
}

/**
 * Vérifie si une commande peut être annulée
 *
 * @param order - Commande à vérifier
 * @returns true si la commande peut être annulée
 */
export function canCancelOrder(order: OrderForShipValidation): boolean {
	// Ne peut pas annuler si déjà expédiée, livrée ou annulée
	if (
		order.status === OrderStatus.SHIPPED ||
		order.status === OrderStatus.DELIVERED ||
		order.status === OrderStatus.CANCELLED
	) {
		return false;
	}

	return true;
}

/**
 * Vérifie si une commande peut être remboursée
 *
 * @param order - Commande à vérifier
 * @returns true si la commande peut être remboursée
 */
export function canRefundOrder(order: OrderForShipValidation): boolean {
	// Doit être payée (ou partiellement remboursée) pour être remboursée
	if (
		order.paymentStatus !== PaymentStatus.PAID &&
		order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
	) {
		return false;
	}

	// Ne peut pas rembourser si annulée
	if (order.status === OrderStatus.CANCELLED) {
		return false;
	}

	return true;
}

// ============================================================================
// STATUS TRANSITION VALIDATORS
// ============================================================================

/**
 * Vérifie si une commande peut être marquée comme livrée
 */
export function canMarkAsDelivered(order: { status: OrderStatus }): DeliveryValidationResult {
	if (order.status === OrderStatus.DELIVERED) {
		return { canDeliver: false, reason: "already_delivered" };
	}
	if (order.status !== OrderStatus.SHIPPED) {
		return { canDeliver: false, reason: "not_shipped" };
	}
	return { canDeliver: true };
}

/**
 * Vérifie si une commande peut être marquée comme retournée
 */
export function canMarkAsReturned(order: {
	status: OrderStatus;
	fulfillmentStatus: FulfillmentStatus;
}): ReturnValidationResult {
	if (order.fulfillmentStatus === FulfillmentStatus.RETURNED) {
		return { canReturn: false, reason: "already_returned" };
	}
	if (order.status !== OrderStatus.DELIVERED) {
		return { canReturn: false, reason: "not_delivered" };
	}
	return { canReturn: true };
}

/**
 * Vérifie si une commande peut passer en cours de préparation
 */
export function canMarkAsProcessing(order: OrderForShipValidation): ProcessingValidationResult {
	if (order.status === OrderStatus.PROCESSING) {
		return { canProcess: false, reason: "already_processing" };
	}
	if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
		return { canProcess: false, reason: "not_pending" };
	}
	if (order.status === OrderStatus.CANCELLED) {
		return { canProcess: false, reason: "cancelled" };
	}
	if (
		order.paymentStatus !== PaymentStatus.PAID &&
		order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
	) {
		return { canProcess: false, reason: "unpaid" };
	}
	return { canProcess: true };
}

/**
 * Vérifie si une commande peut être remise en préparation
 */
export function canRevertToProcessing(order: { status: OrderStatus }): RevertValidationResult {
	if (order.status !== OrderStatus.SHIPPED) {
		return { canRevert: false, reason: "not_shipped" };
	}
	return { canRevert: true };
}

// ============================================================================
// PERMISSIONS (Machine d'état complète)
// ============================================================================

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

	const isPaid = order.paymentStatus === PaymentStatus.PAID;
	const isPartiallyRefunded = order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;
	const isPaidOrPartiallyRefunded = isPaid || isPartiallyRefunded;
	const isPaymentPending = order.paymentStatus === PaymentStatus.PENDING;
	const hasTrackingNumber = !!order.trackingNumber;

	return {
		// Remboursement possible si payé (ou partiellement remboursé) et pas annulé/retourné
		canRefund: (isProcessing || isShipped || isDelivered) && isPaidOrPartiallyRefunded,

		// Mise à jour du suivi possible si expédié/livré avec numéro de suivi
		canUpdateTracking: (isShipped || isDelivered) && hasTrackingNumber,

		// Expédition possible si en traitement et payé (ou partiellement remboursé)
		canMarkAsShipped: isProcessing && isPaidOrPartiallyRefunded,

		// Livraison possible si expédié
		canMarkAsDelivered: isShipped,

		// Passage en traitement possible si en attente et payé (ou partiellement remboursé)
		canMarkAsProcessing: isPending && isPaidOrPartiallyRefunded,

		// Marquage comme payé possible si paiement en attente
		canMarkAsPaid: isPaymentPending && (isPending || isProcessing),

		// Annulation possible si pas encore expédié
		canCancel: (isPending || isProcessing) && !isCancelled,

		// Retour en traitement possible si expédié
		canRevertToProcessing: isShipped,
	};
}

/**
 * Vérifie si le suivi peut être mis à jour
 */
export function canUpdateOrderTracking(order: OrderStateInput): boolean {
	return getOrderPermissions(order).canUpdateTracking;
}
