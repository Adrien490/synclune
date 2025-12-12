import Stripe from "stripe";
import { prisma } from "@/shared/lib/prisma";
import {
	syncStripeRefunds,
	updateOrderPaymentStatus,
	sendRefundConfirmation,
	findRefundByStripeId,
	mapStripeRefundStatus,
	updateRefundStatus,
	markRefundAsFailed,
	sendRefundFailedAlert,
} from "../services/refund.service";

/**
 * Gère les remboursements (charge.refunded)
 * Synchronise les remboursements Stripe avec la base de données
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
	console.log(`💰 [WEBHOOK] Charge refunded: ${charge.id}`);

	try {
		// 1. Récupérer le payment intent associé
		const paymentIntentId = typeof charge.payment_intent === "string"
			? charge.payment_intent
			: charge.payment_intent?.id;

		if (!paymentIntentId) {
			console.error("❌ [WEBHOOK] No payment intent found for refunded charge");
			return;
		}

		// 2. Trouver la commande via payment intent
		const order = await prisma.order.findUnique({
			where: { stripePaymentIntentId: paymentIntentId },
			select: {
				id: true,
				orderNumber: true,
				total: true,
				paymentStatus: true,
				customerEmail: true,
				customerName: true,
				refunds: {
					select: {
						id: true,
						amount: true,
						status: true,
						stripeRefundId: true,
					},
				},
			},
		});

		if (!order) {
			console.warn(`⚠️ [WEBHOOK] Order not found for payment intent ${paymentIntentId}`);
			return;
		}

		// 3. Synchroniser les remboursements Stripe avec la base
		await syncStripeRefunds(charge, order.refunds, order.id);

		// 4. Mettre à jour le statut de paiement de la commande
		const totalRefundedOnStripe = charge.amount_refunded || 0;
		const { isFullyRefunded } = await updateOrderPaymentStatus(
			order.id,
			order.total,
			totalRefundedOnStripe,
			order.paymentStatus
		);

		console.log(
			`📄 [WEBHOOK] Refund processed for order ${order.orderNumber} ` +
			`(${isFullyRefunded ? "total" : "partial"}: ${totalRefundedOnStripe / 100}€)`
		);

		// 5. Envoyer email de confirmation au client
		if (order.customerEmail) {
			const stripeRefunds = charge.refunds?.data || [];
			const latestRefund = stripeRefunds[0];
			const reason = latestRefund?.reason || "OTHER";

			await sendRefundConfirmation(
				order.customerEmail,
				order.orderNumber,
				order.customerName || "Client",
				totalRefundedOnStripe,
				order.total,
				isFullyRefunded,
				reason
			);
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling charge refunded:`, error);
	}
}

/**
 * Gère les événements refund.created et refund.updated
 * Synchronise le statut du remboursement avec la base de données
 */
export async function handleRefundUpdated(stripeRefund: Stripe.Refund): Promise<void> {
	console.log(`💰 [WEBHOOK] Refund updated: ${stripeRefund.id}, status: ${stripeRefund.status}`);

	try {
		// 1. Trouver le remboursement local
		const refund = await findRefundByStripeId(
			stripeRefund.id,
			stripeRefund.metadata?.refund_id ?? undefined
		);

		if (!refund) {
			console.log(`ℹ️ [WEBHOOK] Refund ${stripeRefund.id} not found in database (may be external)`);
			return;
		}

		// 2. Mapper le statut Stripe vers notre statut
		const newStatus = mapStripeRefundStatus(stripeRefund.status ?? undefined);

		// 3. Mettre à jour si le statut a changé
		if (newStatus && refund.status !== newStatus) {
			await updateRefundStatus(refund.id, newStatus, stripeRefund.status || "unknown");
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling refund updated:`, error);
	}
}

/**
 * Gère les échecs de remboursement
 * Marque le remboursement comme FAILED et alerte l'admin
 */
export async function handleRefundFailed(stripeRefund: Stripe.Refund): Promise<void> {
	console.log(`❌ [WEBHOOK] Refund failed: ${stripeRefund.id}`);

	try {
		// 1. Trouver le remboursement local
		const refund = await findRefundByStripeId(
			stripeRefund.id,
			stripeRefund.metadata?.refund_id ?? undefined
		);

		if (!refund) {
			console.warn(`⚠️ [WEBHOOK] Failed refund ${stripeRefund.id} not found in database`);
			return;
		}

		// 2. Marquer comme FAILED
		const failureReason = stripeRefund.failure_reason || "unknown";
		await markRefundAsFailed(refund.id, failureReason);

		// 3. Alerter l'admin
		await sendRefundFailedAlert(refund, failureReason);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling refund failed:`, error);
	}
}
