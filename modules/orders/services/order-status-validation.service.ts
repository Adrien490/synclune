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

// ============================================================================
// ORDER STATUS VALIDATION SERVICE
// Pure functions for validating order status transitions
// ============================================================================

/**
 * Vérifie si une commande peut être marquée comme expédiée
 *
 * Règles :
 * - La commande doit être en cours de préparation (PROCESSING). Le passage
 *   PENDING → SHIPPED est interdit pour aligner backend et UI ;
 *   l'admin doit d'abord exécuter `markAsProcessing`.
 * - La commande doit être payée (PAID ou PARTIALLY_REFUNDED)
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

	// Vérifier si en préparation (PENDING bloqué — doit passer par PROCESSING)
	if (order.status !== OrderStatus.PROCESSING) {
		return { canShip: false, reason: "not_processing" };
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

// `canRefundOrder()` a été SUPPRIMÉ (audit « Admin commandes » 2026-07-26) : il
// autorisait une commande PENDING alors que `getOrderPermissions().canRefund` exige
// PROCESSING|SHIPPED|DELIVERED. Deux définitions divergentes du même concept dans le
// même fichier, dont une seule était consommée (l'autre n'avait que ses propres tests)
// = piège de dérive garanti. La SSOT est `getOrderPermissions().canRefund`.

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
	const isRefunded = order.paymentStatus === PaymentStatus.REFUNDED;
	const isPaymentPending = order.paymentStatus === PaymentStatus.PENDING;
	const isPaymentFailed = order.paymentStatus === PaymentStatus.FAILED;
	const isPaymentExpired = order.paymentStatus === PaymentStatus.EXPIRED;
	const hasTrackingNumber = !!order.trackingNumber;

	const isReturned = order.fulfillmentStatus === FulfillmentStatus.RETURNED;

	return {
		// Suppression (soft delete) possible seulement sur une commande jamais facturée
		// et jamais encaissée — miroir EXACT des gardes de `delete-order.ts`.
		// Cette règle vivait dupliquée dans `use-order-actions.ts` : la rapatrier ici
		// évite qu'un des deux côtés dérive en silence (le SSOT des permissions, c'est
		// cette fonction, consommée par les 3 surfaces UI).
		canDelete: !order.invoiceNumber && !isPaid && !isRefunded,

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

		// Marquage comme payé possible si paiement en attente OU échoué/expiré
		// (ORD-BIZ-004 : recovery après paiement bancaire manuel post-échec ou
		// expiration session checkout). Bloqué sur PAID/PARTIALLY_REFUNDED/REFUNDED
		// pour éviter double comptabilisation. L'action ajoute des safety guards
		// (pas de Refund existant, pas de cancellation, etc.).
		canMarkAsPaid:
			(isPaymentPending || isPaymentFailed || isPaymentExpired) && (isPending || isProcessing),

		// Annulation possible si pas encore expédié
		canCancel: (isPending || isProcessing) && !isCancelled,

		// Retour en traitement possible si expédié
		canRevertToProcessing: isShipped,

		// Retour possible si livré et pas encore retourné
		canMarkAsReturned: isDelivered && !isReturned,

		// Marquage manuel comme entièrement remboursé (hors Stripe) :
		// remboursement bancaire / chèque / virement / geste commercial.
		// Le service action verifie en plus l'absence de Refund Stripe PENDING/APPROVED
		// (cf. mark-as-fully-refunded.ts:122-131).
		canMarkAsFullyRefunded: isPaidOrPartiallyRefunded,
	};
}

// `canUpdateOrderTracking()` a été SUPPRIMÉ : wrapper d'une ligne sans aucun appelant
// (ses seules références étaient ses propres tests). Lire
// `getOrderPermissions(order).canUpdateTracking` directement, comme le font les 3
// surfaces UI. NB : la garde de la page `/[id]/suivi` n'utilise volontairement PAS
// cette permission — elle inclut `hasTrackingNumber`, ce qui fermerait l'ajout d'un
// suivi manquant à une commande expédiée (cf. commentaire de la page).
