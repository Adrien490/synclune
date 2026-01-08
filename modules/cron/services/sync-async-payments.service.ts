import Stripe from "stripe";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import {
	markOrderAsPaid,
	markOrderAsFailed,
	extractPaymentFailureDetails,
	restoreStockForOrder,
} from "@/modules/webhooks/services/payment-intent.service";

/**
 * Service de synchronisation des paiements asynchrones
 *
 * Les méthodes de paiement asynchrones (SEPA Direct Debit, Sofort, etc.)
 * peuvent prendre 3-5 jours ouvrés pour être confirmées.
 * Ce cron poll Stripe pour réconcilier les statuts en cas d'échec webhook.
 */
export async function syncAsyncPayments(): Promise<{
	checked: number;
	updated: number;
	errors: number;
}> {
	console.log("[CRON:sync-async-payments] Starting async payment sync...");

	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

	// Trouver les commandes avec paiement PENDING depuis plus d'1h et moins de 7 jours
	// (au-delà de 7 jours, les paiements async échouent généralement)
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	const pendingOrders = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: { not: null },
			createdAt: {
				gte: sevenDaysAgo,
				lt: oneHourAgo,
			},
			deletedAt: null,
		},
		select: {
			id: true,
			orderNumber: true,
			stripePaymentIntentId: true,
			paymentStatus: true,
		},
	});

	console.log(
		`[CRON:sync-async-payments] Found ${pendingOrders.length} pending orders to check`
	);

	let updated = 0;
	let errors = 0;

	for (const order of pendingOrders) {
		if (!order.stripePaymentIntentId) continue;

		try {
			const paymentIntent = await stripe.paymentIntents.retrieve(
				order.stripePaymentIntentId
			);

			// Vérifier si le statut a changé
			if (paymentIntent.status === "succeeded") {
				// Le paiement a réussi mais le webhook n'a pas été reçu
				console.log(
					`[CRON:sync-async-payments] Order ${order.orderNumber} payment succeeded (webhook missed)`
				);
				await markOrderAsPaid(order.id, order.stripePaymentIntentId);
				updated++;
			} else if (
				paymentIntent.status === "canceled" ||
				paymentIntent.status === "requires_payment_method"
			) {
				// Le paiement a échoué
				console.log(
					`[CRON:sync-async-payments] Order ${order.orderNumber} payment failed: ${paymentIntent.status}`
				);
				const failureDetails = extractPaymentFailureDetails(paymentIntent);
				await markOrderAsFailed(order.id, order.stripePaymentIntentId, failureDetails);
				await restoreStockForOrder(order.id);
				updated++;
			}
			// Les autres statuts (processing, requires_action) sont encore en attente
		} catch (error) {
			console.error(
				`[CRON:sync-async-payments] Error checking order ${order.orderNumber}:`,
				error
			);
			errors++;
		}
	}

	console.log(
		`[CRON:sync-async-payments] Sync completed: ${updated} updated, ${errors} errors`
	);

	return {
		checked: pendingOrders.length,
		updated,
		errors,
	};
}
