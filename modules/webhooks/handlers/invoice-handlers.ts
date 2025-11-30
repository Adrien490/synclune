import Stripe from "stripe";
import { prisma } from "@/shared/lib/prisma";

/**
 * 📄 Gère la finalisation d'une facture Stripe
 * Stocke le invoiceNumber (numéro séquentiel Stripe) dans la commande
 *
 * Appelé quand une facture passe de DRAFT à OPEN ou PAID
 * Le numéro n'est attribué qu'à la finalisation (garantit la séquentialité)
 */
export async function handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
	console.log(`📄 [WEBHOOK] Invoice finalized: ${invoice.id}, number: ${invoice.number}`);

	try {
		// Récupérer l'orderId depuis les métadonnées de la facture
		const orderId = invoice.metadata?.orderId;

		if (!orderId) {
			// Essayer de trouver via stripeInvoiceId (si déjà enregistré)
			const order = await prisma.order.findFirst({
				where: { stripeInvoiceId: invoice.id },
				select: { id: true, orderNumber: true },
			});

			if (order) {
				await prisma.order.update({
					where: { id: order.id },
					data: {
						invoiceNumber: invoice.number || undefined,
						invoiceStatus: "FINALIZED",
					},
				});
				console.log(`✅ [WEBHOOK] Invoice ${invoice.number} linked to order ${order.orderNumber}`);
				return;
			}

			// Essayer via le numéro de commande dans les metadata
			const orderNumber = invoice.metadata?.orderNumber;
			if (orderNumber) {
				const orderByNumber = await prisma.order.findUnique({
					where: { orderNumber },
					select: { id: true, orderNumber: true },
				});

				if (orderByNumber) {
					await prisma.order.update({
						where: { id: orderByNumber.id },
						data: {
							stripeInvoiceId: invoice.id,
							invoiceNumber: invoice.number || undefined,
							invoiceStatus: "FINALIZED",
						},
					});
					console.log(`✅ [WEBHOOK] Invoice ${invoice.number} linked to order ${orderByNumber.orderNumber}`);
					return;
				}
			}

			console.warn(`⚠️ [WEBHOOK] Could not link invoice ${invoice.id} to any order`);
			return;
		}

		// Mettre à jour la commande avec le numéro de facture
		await prisma.order.update({
			where: { id: orderId },
			data: {
				stripeInvoiceId: invoice.id,
				invoiceNumber: invoice.number || undefined,
				invoiceStatus: "FINALIZED",
			},
		});

		console.log(`✅ [WEBHOOK] Invoice ${invoice.number} stored for order ${orderId}`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling invoice finalized:`, error);
		throw error;
	}
}

/**
 * 💰 Gère le paiement réussi d'une facture
 * Met à jour invoiceStatus = PAID
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
	console.log(`💰 [WEBHOOK] Invoice paid: ${invoice.id}, number: ${invoice.number}`);

	try {
		// Trouver la commande via stripeInvoiceId ou metadata
		let order = await prisma.order.findFirst({
			where: { stripeInvoiceId: invoice.id },
			select: { id: true, orderNumber: true },
		});

		if (!order) {
			// Essayer via orderNumber dans les metadata
			const orderNumber = invoice.metadata?.orderNumber;
			if (orderNumber) {
				order = await prisma.order.findUnique({
					where: { orderNumber },
					select: { id: true, orderNumber: true },
				});
			}
		}

		if (!order) {
			// Essayer via orderId dans les metadata
			const orderId = invoice.metadata?.orderId;
			if (orderId) {
				order = await prisma.order.findUnique({
					where: { id: orderId },
					select: { id: true, orderNumber: true },
				});
			}
		}

		if (!order) {
			console.warn(`⚠️ [WEBHOOK] Order not found for paid invoice ${invoice.id}`);
			return;
		}

		await prisma.order.update({
			where: { id: order.id },
			data: {
				invoiceStatus: "PAID",
				// S'assurer que le invoiceNumber est bien stocké
				invoiceNumber: invoice.number || undefined,
			},
		});

		console.log(`✅ [WEBHOOK] Invoice status updated to PAID for order ${order.orderNumber}`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling invoice paid:`, error);
		throw error;
	}
}

/**
 * ❌ Gère l'échec de paiement d'une facture
 * Met à jour invoiceStatus = PAYMENT_FAILED et log dans AuditLog
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
	console.log(`❌ [WEBHOOK] Invoice payment failed: ${invoice.id}`);

	try {
		// Trouver la commande via stripeInvoiceId ou metadata
		let order = await prisma.order.findFirst({
			where: { stripeInvoiceId: invoice.id },
			select: { id: true, orderNumber: true },
		});

		if (!order) {
			// Essayer via orderNumber dans les metadata
			const orderNumber = invoice.metadata?.orderNumber;
			if (orderNumber) {
				order = await prisma.order.findUnique({
					where: { orderNumber },
					select: { id: true, orderNumber: true },
				});
			}
		}

		if (!order) {
			// Essayer via orderId dans les metadata
			const orderId = invoice.metadata?.orderId;
			if (orderId) {
				order = await prisma.order.findUnique({
					where: { id: orderId },
					select: { id: true, orderNumber: true },
				});
			}
		}

		if (!order) {
			console.warn(`⚠️ [WEBHOOK] Order not found for failed invoice ${invoice.id}`);
			return;
		}

		// Mettre à jour le statut
		await prisma.order.update({
			where: { id: order.id },
			data: {
				invoiceStatus: "PAYMENT_FAILED",
			},
		});

		// Log pour traçabilité (Dashboard Stripe = source de vérité)
		console.log(`[AUDIT] Invoice payment failed`, {
			orderId: order.id,
			orderNumber: order.orderNumber,
			invoiceId: invoice.id,
			invoiceNumber: invoice.number,
			attemptCount: invoice.attempt_count,
			nextPaymentAttempt: invoice.next_payment_attempt
				? new Date(invoice.next_payment_attempt * 1000).toISOString()
				: null,
		});
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling invoice payment failed:`, error);
		throw error;
	}
}
