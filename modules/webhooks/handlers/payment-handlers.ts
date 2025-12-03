import Stripe from "stripe";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendAdminRefundFailedAlert } from "@/shared/lib/email";

/**
 * 🔴 CRITIQUE - Gère le succès d'un paiement via Payment Intent
 * Utilisé pour les flux de paiement directs (non Checkout Session)
 *
 * NOTE: Ce handler ne gère PAS l'envoi d'emails car :
 * - L'événement payment_intent.succeeded arrive APRÈS checkout.session.completed
 * - Les emails et la décrémentation du stock sont gérés dans handleCheckoutSessionCompleted
 * - Évite les doublons d'emails et les doubles décrementations de stock
 */
export async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		return;
	}

	await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
		// Mettre à jour la commande
		await tx.order.update({
			where: { id: orderId },
			data: {
				status: "PROCESSING",
				paymentStatus: "PAID",
				stripePaymentIntentId: paymentIntent.id,
				paidAt: new Date(),
			},
			include: {
				items: {
					include: {
						sku: true,
					},
				},
			},
		});
	});
}

/**
 * 🔴 CRITIQUE - Gère l'échec d'un paiement
 * Restaure le stock réservé et initie un remboursement si nécessaire
 */
export async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		console.error("❌ [WEBHOOK] No order_id in payment intent metadata");
		return;
	}

	try {
		// 1. Récupérer la commande avec ses items pour vérifier si le stock doit être restauré
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				orderNumber: true,
				status: true,
				paymentStatus: true,
				items: {
					select: {
						skuId: true,
						quantity: true,
					},
				},
			},
		});

		if (!order) {
			console.error(`❌ [WEBHOOK] Order ${orderId} not found for payment failure handling`);
			return;
		}

		// 2. Vérifier si le stock a été décrémenté (statut PROCESSING = paiement avait réussi)
		const shouldRestoreStock = order.status === "PROCESSING" || order.paymentStatus === "PAID";

		// 3. Extraire les codes d'erreur du payment intent
		const lastError = paymentIntent.last_payment_error;
		const paymentFailureCode = lastError?.code ?? null;
		const paymentDeclineCode = lastError?.decline_code ?? null;
		const paymentFailureMessage = lastError?.message ?? null;

		console.log(`[AUDIT] Payment failure details`, {
			orderId,
			orderNumber: order.orderNumber,
			failureCode: paymentFailureCode,
			declineCode: paymentDeclineCode,
			message: paymentFailureMessage,
		});

		// 4. Transaction pour mettre à jour la commande ET restaurer le stock si nécessaire
		await prisma.$transaction(async (tx) => {
			// Mettre à jour le statut de la commande avec les codes d'erreur
			await tx.order.update({
				where: { id: orderId },
				data: {
					paymentStatus: "FAILED",
					status: "CANCELLED",
					stripePaymentIntentId: paymentIntent.id,
					paymentFailureCode,
					paymentDeclineCode,
					paymentFailureMessage,
				},
			});

			// Restaurer le stock si nécessaire
			if (shouldRestoreStock && order.items.length > 0) {
				for (const item of order.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: {
							inventory: { increment: item.quantity },
							// Réactiver le SKU si stock restauré
							isActive: true,
						},
					});
				}
				console.log(`📦 [WEBHOOK] Stock restored for ${order.items.length} items on order ${order.orderNumber}`);
			}
		});

		// 4. Remboursement automatique SEULEMENT si de l'argent a été capturé
		// Note: requires_payment_method = paiement jamais capturé, donc pas de remboursement nécessaire
		if (paymentIntent.amount_received > 0) {
			console.log(`💰 [WEBHOOK] Initiating automatic refund for order ${orderId} (${paymentIntent.amount_received} cents captured)`);

			try {
				const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

				const refund = await stripe.refunds.create({
					payment_intent: paymentIntent.id,
					reason: "requested_by_customer",
					metadata: {
						orderId,
						reason: "Payment failed, automatic refund",
					},
				}, {
					idempotencyKey: `auto-refund-failed-${paymentIntent.id}`,
				});

				console.log(`✅ [WEBHOOK] Refund created successfully: ${refund.id} for order ${orderId}`);
			} catch (refundError) {
				console.error(`❌ [WEBHOOK] Failed to create refund for order ${orderId}:`, refundError);

				// Envoyer alerte admin pour traitement manuel
				try {
					const failedOrder = await prisma.order.findUnique({
						where: { id: orderId },
						select: {
							orderNumber: true,
							total: true,
							user: { select: { email: true } },
						},
					});

					if (failedOrder) {
						const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
						const dashboardUrl = `${baseUrl}/dashboard/orders/${orderId}`;

						await sendAdminRefundFailedAlert({
							orderNumber: failedOrder.orderNumber,
							orderId,
							customerEmail: failedOrder.user?.email || "Email non disponible",
							amount: failedOrder.total,
							reason: "payment_failed",
							errorMessage: refundError instanceof Error ? refundError.message : String(refundError),
							stripePaymentIntentId: paymentIntent.id,
							dashboardUrl,
						});

						console.log(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${orderId}`);
					}
				} catch (alertError) {
					console.error(`❌ [WEBHOOK] Failed to send refund failure alert for order ${orderId}:`, alertError);
				}
			}
		}

		console.log(`❌ [WEBHOOK] Order ${orderId} payment failed`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling payment failure for order ${orderId}:`, error);
		throw error;
	}
}

/**
 * 🔴 CRITIQUE - Gère l'annulation d'un paiement
 * Annule la commande et initie un remboursement si nécessaire
 */
export async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		console.error("❌ [WEBHOOK] No order_id in payment intent metadata");
		return;
	}

	try {
		// Mettre à jour le statut de la commande
		await prisma.order.update({
			where: { id: orderId },
			data: {
				status: "CANCELLED",
				paymentStatus: "FAILED",
				stripePaymentIntentId: paymentIntent.id,
			},
		});

		// 🔴 Remboursement automatique si paiement a été capturé
		if (paymentIntent.status === "canceled" && paymentIntent.amount_received > 0) {
			console.log(`💰 [WEBHOOK] Initiating automatic refund for canceled order ${orderId}`);

			try {
				const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

				const refund = await stripe.refunds.create({
					payment_intent: paymentIntent.id,
					reason: "requested_by_customer",
					metadata: {
						orderId,
						reason: "Payment canceled, automatic refund",
					},
				}, {
					idempotencyKey: `auto-refund-canceled-${paymentIntent.id}`,
				});

				console.log(`✅ [WEBHOOK] Refund created successfully: ${refund.id} for order ${orderId}`);
			} catch (refundError) {
				console.error(`❌ [WEBHOOK] Failed to create refund for order ${orderId}:`, refundError);

				// Envoyer alerte admin pour traitement manuel
				try {
					const failedOrder = await prisma.order.findUnique({
						where: { id: orderId },
						select: {
							orderNumber: true,
							total: true,
							user: { select: { email: true } },
						},
					});

					if (failedOrder) {
						const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
						const dashboardUrl = `${baseUrl}/dashboard/orders/${orderId}`;

						await sendAdminRefundFailedAlert({
							orderNumber: failedOrder.orderNumber,
							orderId,
							customerEmail: failedOrder.user?.email || "Email non disponible",
							amount: failedOrder.total,
							reason: "payment_canceled",
							errorMessage: refundError instanceof Error ? refundError.message : String(refundError),
							stripePaymentIntentId: paymentIntent.id,
							dashboardUrl,
						});

						console.log(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${orderId}`);
					}
				} catch (alertError) {
					console.error(`❌ [WEBHOOK] Failed to send refund failure alert for order ${orderId}:`, alertError);
				}
			}
		}

		console.log(`⚠️ [WEBHOOK] Order ${orderId} payment canceled`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling payment cancelation for order ${orderId}:`, error);
		throw error;
	}
}
