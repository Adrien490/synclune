/**
 * Service de validation des statuts de commande
 *
 * Ce module contient les fonctions pures pour :
 * - Valider les transitions de statut
 * - Vérifier si une commande peut être expédiée
 * - Vérifier si une commande peut être annulée
 * - Calculer les permissions disponibles selon l'état
 */

import {
	OrderStatus,
	PaymentStatus,
} from "@/app/generated/prisma/browser"

import type {
	OrderForShipValidation,
	ShipValidationResult,
	OrderStateInput,
	OrderPermissions,
} from "../types/order.types"

export type {
	OrderForShipValidation,
	ShipValidationResult,
	ShipBlockReason,
	OrderStateInput,
	OrderPermissions,
} from "../types/order.types"

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
export function canMarkAsShipped(
	order: OrderForShipValidation
): ShipValidationResult {
	// Vérifier si déjà expédiée/livrée
	if (
		order.status === OrderStatus.SHIPPED ||
		order.status === OrderStatus.DELIVERED
	) {
		return { canShip: false, reason: "already_shipped" };
	}

	// Vérifier si annulée
	if (order.status === OrderStatus.CANCELLED) {
		return { canShip: false, reason: "cancelled" };
	}

	// Vérifier si payée
	if (order.paymentStatus !== PaymentStatus.PAID) {
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
	return (
		status === OrderStatus.DELIVERED ||
		status === OrderStatus.CANCELLED
	);
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
	// Doit être payée pour être remboursée
	if (order.paymentStatus !== PaymentStatus.PAID) {
		return false;
	}

	// Ne peut pas rembourser si annulée
	if (order.status === OrderStatus.CANCELLED) {
		return false;
	}

	return true;
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
 * Vérifie si le suivi peut être mis à jour
 */
export function canUpdateOrderTracking(order: OrderStateInput): boolean {
	return getOrderPermissions(order).canUpdateTracking;
}
