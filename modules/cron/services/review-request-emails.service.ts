import { FulfillmentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendReviewRequestEmailInternal } from "@/modules/reviews/actions/send-review-request-email";
import { ActionStatus } from "@/shared/types/server-action";

const DAYS_AFTER_DELIVERY = 2; // Envoyer 2 jours après livraison

/**
 * Service d'envoi des emails de demande d'avis différés
 *
 * Envoie les emails de demande d'avis 2-3 jours après la livraison
 * pour laisser le temps au client de tester le produit.
 */
export async function sendDelayedReviewRequestEmails(): Promise<{
	found: number;
	sent: number;
	errors: number;
}> {
	console.log(
		"[CRON:review-request-emails] Starting delayed review request emails..."
	);

	const deliveryThreshold = new Date(
		Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000
	);

	// Trouver les commandes livrées il y a plus de 2 jours sans email d'avis envoyé
	const ordersToNotify = await prisma.order.findMany({
		where: {
			...notDeleted,
			fulfillmentStatus: FulfillmentStatus.DELIVERED,
			actualDelivery: {
				lt: deliveryThreshold,
				// Pas plus de 14 jours (éviter de spammer les anciennes commandes)
				gt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
			},
			reviewRequestSentAt: null,
		},
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
		},
		take: 50, // Limiter pour éviter timeout
	});

	console.log(
		`[CRON:review-request-emails] Found ${ordersToNotify.length} orders to send review requests`
	);

	let sent = 0;
	let errors = 0;

	for (const order of ordersToNotify) {
		try {
			const result = await sendReviewRequestEmailInternal(order.id);

			if (result.status === ActionStatus.SUCCESS) {
				sent++;
				console.log(
					`[CRON:review-request-emails] Sent review request for order ${order.orderNumber}`
				);
			} else {
				console.warn(
					`[CRON:review-request-emails] Failed to send for order ${order.orderNumber}: ${result.message}`
				);
				errors++;
			}
		} catch (error) {
			console.error(
				`[CRON:review-request-emails] Error sending for order ${order.orderNumber}:`,
				error
			);
			errors++;
		}
	}

	console.log(
		`[CRON:review-request-emails] Completed: ${sent} sent, ${errors} errors`
	);

	return {
		found: ordersToNotify.length,
		sent,
		errors,
	};
}
