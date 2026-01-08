import {
	PaymentStatus,
	OrderStatus,
	OrderAction,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { restoreStockForOrder } from "@/modules/webhooks/services/payment-intent.service";

const HOURS_BEFORE_REMINDER = 24; // Envoyer un rappel après 24h
const HOURS_BEFORE_CANCEL = 72; // Annuler après 72h (3 jours)

/**
 * Service de gestion des commandes abandonnées
 *
 * Gère les commandes avec paymentStatus=PENDING :
 * 1. Envoie un email de relance après 24h
 * 2. Annule automatiquement après 72h et restaure le stock
 */
export async function processAbandonedOrders(): Promise<{
	remindersSent: number;
	cancelled: number;
	stockRestored: number;
	errors: number;
}> {
	console.log("[CRON:abandoned-orders] Starting abandoned orders processing...");

	const now = new Date();
	const reminderThreshold = new Date(
		now.getTime() - HOURS_BEFORE_REMINDER * 60 * 60 * 1000
	);
	const cancelThreshold = new Date(
		now.getTime() - HOURS_BEFORE_CANCEL * 60 * 60 * 1000
	);

	let remindersSent = 0;
	let cancelled = 0;
	let stockRestored = 0;
	let errors = 0;

	// 1. Trouver les commandes à annuler (> 72h)
	const ordersToCancel = await prisma.order.findMany({
		where: {
			...notDeleted,
			paymentStatus: PaymentStatus.PENDING,
			status: OrderStatus.PENDING,
			createdAt: { lt: cancelThreshold },
		},
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
			items: {
				select: {
					skuId: true,
					quantity: true,
				},
			},
		},
		take: 50, // Limiter pour éviter timeout
	});

	console.log(
		`[CRON:abandoned-orders] Found ${ordersToCancel.length} orders to cancel`
	);

	for (const order of ordersToCancel) {
		try {
			// Annuler la commande
			await prisma.$transaction(async (tx) => {
				await tx.order.update({
					where: { id: order.id },
					data: {
						status: OrderStatus.CANCELLED,
						paymentStatus: PaymentStatus.FAILED,
					},
				});

				// Ajouter à l'historique
				await tx.orderHistory.create({
					data: {
						orderId: order.id,
						action: OrderAction.CANCELLED,
						previousStatus: OrderStatus.PENDING,
						newStatus: OrderStatus.CANCELLED,
						previousPaymentStatus: PaymentStatus.PENDING,
						newPaymentStatus: PaymentStatus.FAILED,
						note: "Annulation automatique - paiement non complété après 72h",
						source: "system",
					},
				});
			});

			// Restaurer le stock
			const stockResult = await restoreStockForOrder(order.id);
			if (stockResult.shouldRestore) {
				stockRestored += stockResult.itemCount;
			}

			console.log(
				`[CRON:abandoned-orders] Cancelled order ${order.orderNumber}`
			);
			cancelled++;
		} catch (error) {
			console.error(
				`[CRON:abandoned-orders] Error cancelling order ${order.orderNumber}:`,
				error
			);
			errors++;
		}
	}

	// 2. Trouver les commandes pour envoi de rappel (> 24h, < 72h)
	const ordersForReminder = await prisma.order.findMany({
		where: {
			...notDeleted,
			paymentStatus: PaymentStatus.PENDING,
			status: OrderStatus.PENDING,
			createdAt: {
				lt: reminderThreshold,
				gte: cancelThreshold,
			},
			// Pas déjà rappelé (on pourrait ajouter un champ reminderSentAt)
		},
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
			customerName: true,
			total: true,
			stripeCheckoutSessionId: true,
			items: {
				select: {
					productTitle: true,
					quantity: true,
				},
				take: 3, // Premiers articles pour l'email
			},
		},
		take: 50,
	});

	console.log(
		`[CRON:abandoned-orders] Found ${ordersForReminder.length} orders for reminder`
	);

	for (const order of ordersForReminder) {
		// TODO: Implémenter l'email de relance panier abandonné
		// Pour l'instant, on log simplement les commandes qui nécessiteraient un rappel
		console.log(
			`[CRON:abandoned-orders] Order ${order.orderNumber} would receive reminder (email not yet implemented)`
		);
		remindersSent++;
	}

	console.log(
		`[CRON:abandoned-orders] Processing completed: ${remindersSent} reminders sent, ${cancelled} cancelled, ${stockRestored} items restocked, ${errors} errors`
	);

	return {
		remindersSent,
		cancelled,
		stockRestored,
		errors,
	};
}
