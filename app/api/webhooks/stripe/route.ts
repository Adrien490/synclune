import { updateTag } from "next/cache";
import { after } from "next/server";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import {
	sendOrderConfirmationEmail,
	sendAdminNewOrderEmail,
	sendAdminRefundFailedAlert,
	sendRefundConfirmationEmail,
	sendAdminDisputeAlert,
	sendPaymentFailedEmail,
} from "@/shared/lib/email";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PaymentStatus, Prisma, RefundStatus, RefundAction } from "@/app/generated/prisma/client";
import { validateSkuAndStock } from "@/modules/cart/lib/sku-validation";
import { getShippingRateName } from "@/modules/orders/constants/stripe-shipping-rates";

// ============================================================================
// 🔴 TYPES POUR TRAITEMENT ASYNCHRONE (Best Practice Stripe 2025)
// ============================================================================

/**
 * Tâches à exécuter après la réponse 200 via after()
 * Permet de répondre rapidement à Stripe tout en traitant les emails en arrière-plan
 */
type PostWebhookTask =
	| { type: "ORDER_CONFIRMATION_EMAIL"; data: Parameters<typeof sendOrderConfirmationEmail>[0] }
	| { type: "ADMIN_NEW_ORDER_EMAIL"; data: Parameters<typeof sendAdminNewOrderEmail>[0] }
	| { type: "REFUND_CONFIRMATION_EMAIL"; data: Parameters<typeof sendRefundConfirmationEmail>[0] }
	| { type: "PAYMENT_FAILED_EMAIL"; data: Parameters<typeof sendPaymentFailedEmail>[0] }
	| { type: "ADMIN_DISPUTE_ALERT"; data: Parameters<typeof sendAdminDisputeAlert>[0] }
	| { type: "ADMIN_REFUND_FAILED_ALERT"; data: Parameters<typeof sendAdminRefundFailedAlert>[0] }
	| { type: "INVALIDATE_CACHE"; tags: string[] };

/**
 * Résultat d'un handler de webhook avec tâches post-traitement
 */
interface WebhookHandlerResult {
	success: boolean;
	tasks: PostWebhookTask[];
}

/**
 * Exécute les tâches post-webhook (emails, cache) en arrière-plan
 */
async function executePostWebhookTasks(tasks: PostWebhookTask[]): Promise<void> {
	for (const task of tasks) {
		try {
			switch (task.type) {
				case "ORDER_CONFIRMATION_EMAIL":
					await sendOrderConfirmationEmail(task.data);
					break;
				case "ADMIN_NEW_ORDER_EMAIL":
					await sendAdminNewOrderEmail(task.data);
					break;
				case "REFUND_CONFIRMATION_EMAIL":
					await sendRefundConfirmationEmail(task.data);
					break;
				case "PAYMENT_FAILED_EMAIL":
					await sendPaymentFailedEmail(task.data);
					break;
				case "ADMIN_DISPUTE_ALERT":
					await sendAdminDisputeAlert(task.data);
					break;
				case "ADMIN_REFUND_FAILED_ALERT":
					await sendAdminRefundFailedAlert(task.data);
					break;
				case "INVALIDATE_CACHE":
					task.tags.forEach(tag => updateTag(tag));
					break;
			}
		} catch (error) {
			// Log mais ne pas bloquer les autres tâches
			console.error(`❌ [WEBHOOK-AFTER] Failed to execute task ${task.type}:`, error);
		}
	}
}

// Note: With cacheComponents enabled, API routes are dynamic by default
// No need for export const dynamic = "force-dynamic"

/**
 * Webhook Stripe
 *
 * Gère les événements Stripe de manière idempotente.
 * L'idempotence est assurée par :
 * - Order.paymentStatus === "PAID" (évite double décrémentation stock)
 * - Refund.stripeRefundId @unique (évite double remboursement)
 */
export async function POST(req: Request) {
	try {
		// Runtime validation of environment variables
		if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
			// console.error("❌ Missing Stripe configuration");
			return NextResponse.json(
				{ error: "Stripe configuration missing" },
				{ status: 500 }
			);
		}

		// Initialize Stripe client at runtime
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		const body = await req.text();
		const headersList = await headers();
		const signature = headersList.get("stripe-signature");

		if (!signature) {
			// console.error("❌ No Stripe signature found");
			return NextResponse.json({ error: "No signature" }, { status: 400 });
		}

		// 1. 🔴 Vérification de la signature (CRITIQUE - Sécurité)
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch (err) {
			// console.error("❌ Webhook signature verification failed:", err);
			return NextResponse.json(
				{
					error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`,
				},
				{ status: 400 }
			);
		}

		// 2. 🔴 ANTI-REPLAY CHECK (Best Practice Stripe 2025)
		// Rejeter les événements trop anciens pour éviter les attaques de replay
		// Stripe recommande une fenêtre de 5 minutes maximum
		const eventAgeSeconds = Math.floor(Date.now() / 1000) - event.created;
		if (eventAgeSeconds > 300) {
			console.warn(`⚠️ [WEBHOOK] Event ${event.id} too old (${eventAgeSeconds}s), rejecting for anti-replay`);
			return NextResponse.json(
				{ error: "Event too old (anti-replay protection)" },
				{ status: 400 }
			);
		}

		// console.log("✅ Stripe webhook event received:", event.type, event.id);

		// 3. Traiter l'événement selon le type
		// Collecter les tâches post-webhook pour exécution via after()
		const postWebhookTasks: PostWebhookTask[] = [];

		try {
			switch (event.type) {
				case "checkout.session.completed": {
					const session = event.data.object as Stripe.Checkout.Session;
					const result = await handleCheckoutSessionCompleted(session);
					if (result?.tasks) {
						postWebhookTasks.push(...result.tasks);
					}
					break;
				}

				case "payment_intent.succeeded": {
					const paymentIntent = event.data.object as Stripe.PaymentIntent;
					await handlePaymentSuccess(paymentIntent);
					break;
				}

				case "payment_intent.payment_failed": {
					const paymentIntent = event.data.object as Stripe.PaymentIntent;
					await handlePaymentFailure(paymentIntent);
					break;
				}

				case "payment_intent.canceled": {
					const paymentIntent = event.data.object as Stripe.PaymentIntent;
					await handlePaymentCanceled(paymentIntent);
					break;
				}

				case "checkout.session.expired": {
					const session = event.data.object as Stripe.Checkout.Session;
					await handleCheckoutSessionExpired(session);
					break;
				}

				case "charge.refunded": {
					const charge = event.data.object as Stripe.Charge;
					await handleChargeRefunded(charge);
					break;
				}

				// === ÉVÉNEMENTS REFUND (API 2024-10-28+) ===
				case "refund.created":
				case "refund.updated": {
					const refund = event.data.object as Stripe.Refund;
					await handleRefundUpdated(refund);
					break;
				}

				case "refund.failed": {
					const refund = event.data.object as Stripe.Refund;
					await handleRefundFailed(refund);
					break;
				}

				// === PAIEMENTS ASYNCHRONES (SEPA, Sofort, etc.) ===
				case "checkout.session.async_payment_succeeded": {
					const session = event.data.object as Stripe.Checkout.Session;
					await handleAsyncPaymentSucceeded(session);
					break;
				}

				case "checkout.session.async_payment_failed": {
					const session = event.data.object as Stripe.Checkout.Session;
					await handleAsyncPaymentFailed(session);
					break;
				}

				// === LITIGES / CHARGEBACKS ===
				case "charge.dispute.created": {
					const dispute = event.data.object as Stripe.Dispute;
					await handleDisputeCreated(dispute);
					break;
				}

				// === FACTURES STRIPE (synchronisation invoiceNumber + statut) ===
				case "invoice.finalized": {
					const invoice = event.data.object as Stripe.Invoice;
					await handleInvoiceFinalized(invoice);
					break;
				}

				case "invoice.paid": {
					const invoice = event.data.object as Stripe.Invoice;
					await handleInvoicePaid(invoice);
					break;
				}

				case "invoice.payment_failed": {
					const invoice = event.data.object as Stripe.Invoice;
					await handleInvoicePaymentFailed(invoice);
					break;
				}

				default:
					// console.log(`⚠️  Unhandled event type: ${event.type}`);
			}

			// 4. 🔴 RÉPONSE RAPIDE + TRAITEMENT ASYNC (Best Practice Stripe 2025)
			// Retourner 200 immédiatement, puis exécuter les tâches en arrière-plan
			const response = NextResponse.json({ received: true, status: "processed" });

			// Exécuter les tâches post-webhook (emails, cache) via after()
			// Ne bloque pas la réponse au webhook
			if (postWebhookTasks.length > 0) {
				after(async () => {
					console.log(`📧 [WEBHOOK-AFTER] Executing ${postWebhookTasks.length} post-webhook tasks...`);
					await executePostWebhookTasks(postWebhookTasks);
					console.log(`✅ [WEBHOOK-AFTER] All post-webhook tasks completed`);
				});
			}

			return response;
		} catch (error) {
			console.error("❌ Error processing webhook event:", error);
			throw error;
		}
	} catch {
		// console.error("❌ Webhook handler error:", error);
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 }
		);
	}
}

async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult | null> {
	// console.log("🎉 Checkout session completed:", session.id);

	// Collecter les tâches post-webhook
	const tasks: PostWebhookTask[] = [];

	// 🔴 CRITIQUE : Validation payment_status AVANT tout traitement
	// Pour les paiements asynchrones (SEPA, etc.), payment_status peut être 'unpaid'
	// Dans ce cas, attendre l'événement checkout.session.async_payment_succeeded
	if (session.payment_status === "unpaid") {
		console.log(`⏳ [WEBHOOK] Session ${session.id} payment_status is 'unpaid', waiting for async payment confirmation`);
		return null;
	}

	try {
		// Récupérer l'ID de commande depuis les metadata
		const orderId = session.metadata?.orderId || session.client_reference_id;

		if (!orderId) {
			console.error("❌ [WEBHOOK] No order ID found in checkout session");
			return null;
		}

		// ℹ️ Micro-entreprise : Pas de calcul TVA (exonérée - art. 293 B du CGI)
		// Récupération de la session avec les informations de livraison
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

		const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
			expand: ["shipping_cost.shipping_rate"],
		});

		// Extraire les frais de livraison et la méthode utilisée
		const shippingCost = fullSession.total_details?.amount_shipping || 0;

		// Récupérer l'ID du shipping rate pour déterminer la méthode
		const shippingRateId =
			typeof fullSession.shipping_cost?.shipping_rate === "string"
				? fullSession.shipping_cost.shipping_rate
				: fullSession.shipping_cost?.shipping_rate?.id;

		// Convertir l'ID en nom lisible (Colissimo France, Europe, DOM-TOM, ou Gratuit)
		const shippingMethod = shippingRateId
			? getShippingRateName(shippingRateId)
			: "Colissimo";

		console.log(`📦 [WEBHOOK] Shipping extracted for order ${orderId}: ${shippingCost / 100}€ (${shippingMethod})`);

		// 🔴 TRANSACTION ATOMIQUE pour éviter les race conditions
		const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			// 1. Récupérer la commande avec ses items et SKUs
			const order = await tx.order.findUnique({
				where: { id: orderId },
				include: {
					items: {
						include: {
							sku: {
								select: {
									id: true,
									inventory: true,
									sku: true,
								},
							},
						},
					},
					user: {
						select: {
							id: true,
						},
					},
				},
			});

			if (!order) {
				throw new Error(`Order not found: ${orderId}`);
			}

			// 2. Vérifier l'idempotence - Si déjà traité, on skip
			if (order.paymentStatus === "PAID") {
				console.log(`⚠️  [WEBHOOK] Order ${orderId} already processed, skipping`);
				return order;
			}

			// 3. 🔴 CRITIQUE - Re-validation de tous les items AVANT de marquer comme PAID
			// Protège contre race conditions où un SKU devient inactif entre checkout et webhook
			console.log(`🔍 [WEBHOOK] Re-validating ${order.items.length} items for order ${orderId}`);

			for (const item of order.items) {
				const validation = await validateSkuAndStock({
					skuId: item.skuId,
					quantity: item.quantity,
				});

				if (!validation.success) {
					console.error(
						`❌ [WEBHOOK] Validation failed for order ${orderId}, SKU ${item.skuId}: ${validation.error}`
					);
					throw new Error(
						`Invalid item in order: ${validation.error} (SKU: ${item.skuId}, Quantity: ${item.quantity})`
					);
				}
			}

			console.log(`✅ [WEBHOOK] All items validated successfully for order ${orderId}`);

			// 4. Décrémenter le stock pour chaque item
			for (const item of order.items) {
				await tx.productSku.update({
					where: { id: item.skuId },
					data: {
						inventory: { decrement: item.quantity },
					},
				});
			}

			console.log(`✅ [WEBHOOK] Stock decremented for order ${orderId}`);

			// 5. Mettre à jour la commande avec infos shipping
			// ℹ️ Micro-entreprise : Pas de données fiscales (exonérée de TVA)
			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "PROCESSING",
					paymentStatus: "PAID",
					paidAt: new Date(),
					stripePaymentIntentId: session.payment_intent as string,
					stripeCheckoutSessionId: session.id,
					stripeCustomerId: (session.customer as string) || null,
					shippingCost,
					// ⚠️ AUDIT FIX: shippingMethod est maintenant un enum (STANDARD, EXPRESS, etc.)
					// La valeur textuelle "Colissimo France" est stockée dans shippingCarrier via le nom de la rate
					shippingMethod: "STANDARD", // Par défaut pour Colissimo
					shippingCarrier: "COLISSIMO", // Transporteur
					// Micro-entreprise : taxAmount = 0, taxRate/taxJurisdiction/taxType/taxDetails = null
				},
			});

			// 5b. Désactiver automatiquement les SKUs épuisés
			for (const item of order.items) {
				const sku = await tx.productSku.findUnique({
					where: { id: item.skuId },
					select: { inventory: true },
				});
				if (sku?.inventory === 0) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: { isActive: false },
					});
					console.log(`📦 [WEBHOOK] SKU ${item.skuId} désactivé (stock épuisé)`);
				}
			}

			// 6. Vider le panier de l'utilisateur après paiement réussi
			if (order.userId) {
				// Supprimer tous les items du panier utilisateur
				await tx.cartItem.deleteMany({
					where: {
						cart: {
							userId: order.userId,
						},
					},
				});

				console.log(
					`🧹 [WEBHOOK] Cart cleared for user ${order.userId} after successful payment`
				);
			}

			console.log("✅ [WEBHOOK] Order processed successfully:", order.orderNumber);

			// Retourner l'order pour utilisation après la transaction
			return order;
		});

		// 7. 🔴 TÂCHE POST-WEBHOOK : Invalider le cache du panier
		if (order?.userId) {
			const cacheTags = getCartInvalidationTags(order.userId, undefined);
			tasks.push({ type: "INVALIDATE_CACHE", tags: cacheTags });
		}

		// 8. Récupérer l'email du client depuis la session Stripe
		const customerEmail = session.customer_email || session.customer_details?.email;

		// ✅ FACTURE AUTOMATIQUE : Stripe génère automatiquement la facture PDF
		// via invoice_creation dans Checkout Session (create-checkout-session.ts:545)
		// La facture est disponible dans le Dashboard Stripe et envoyée au client par email
		console.log(`📄 [WEBHOOK] Invoice automatically generated by Stripe for order ${order.orderNumber}`);
		const invoiceGenerated = true;

		const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";

		// 9. 🔴 TÂCHE POST-WEBHOOK : Email de confirmation au client
		if (customerEmail) {
			const trackingUrl = `${baseUrl}/orders`;

			tasks.push({
				type: "ORDER_CONFIRMATION_EMAIL",
				data: {
					to: customerEmail,
					orderNumber: order.orderNumber,
					customerName: `${order.shippingFirstName} ${order.shippingLastName}`,
					items: order.items.map((item: typeof order.items[number]) => ({
						productTitle: item.productTitle,
						skuColor: item.skuColor,
						skuMaterial: item.skuMaterial,
						skuSize: item.skuSize,
						quantity: item.quantity,
						price: item.price,
					})),
					subtotal: order.subtotal,
					discount: order.discountAmount,
					shipping: order.shippingCost,
					tax: order.taxAmount,
					total: order.total,
					shippingAddress: {
						firstName: order.shippingFirstName,
						lastName: order.shippingLastName,
						address1: order.shippingAddress1,
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode,
						city: order.shippingCity,
						country: order.shippingCountry,
					},
					trackingUrl,
					// 🔒 SÉCURITÉ : URLs supprimées - utiliser orderId pour récupération sécurisée
					orderId: order.id,
					invoiceGenerated,
				},
			});
		}

		// 10. 🔴 TÂCHE POST-WEBHOOK : Notifier l'admin
		const dashboardUrl = `${baseUrl}/dashboard/orders/${order.id}`;

		tasks.push({
			type: "ADMIN_NEW_ORDER_EMAIL",
			data: {
				orderNumber: order.orderNumber,
				orderId: order.id,
				customerName: `${order.shippingFirstName} ${order.shippingLastName}`,
				customerEmail: customerEmail || "Email non disponible",
				items: order.items.map((item: typeof order.items[number]) => ({
					productTitle: item.productTitle,
					skuColor: item.skuColor,
					skuMaterial: item.skuMaterial,
					skuSize: item.skuSize,
					quantity: item.quantity,
					price: item.price,
				})),
				subtotal: order.subtotal,
				discount: order.discountAmount,
				shipping: order.shippingCost,
				tax: order.taxAmount,
				total: order.total,
				shippingAddress: {
					firstName: order.shippingFirstName,
					lastName: order.shippingLastName,
					address1: order.shippingAddress1,
					address2: order.shippingAddress2,
					postalCode: order.shippingPostalCode,
					city: order.shippingCity,
					country: order.shippingCountry,
					phone: order.shippingPhone,
				},
				dashboardUrl,
				stripePaymentIntentId: session.payment_intent as string,
			},
		});

		// Retourner les tâches pour exécution via after()
		return { success: true, tasks };
	} catch (error) {
		console.error("❌ [WEBHOOK] Error handling checkout session completed:", error);
		throw error;
	}
}

/**
 * 🔴 CRITIQUE - Gère le succès d'un paiement via Payment Intent
 * Utilisé pour les flux de paiement directs (non Checkout Session)
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		// console.error("❌ No order_id in payment intent metadata");
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

	// console.log(`✅ Order ${orderId} payment succeeded (Payment Intent)`);
}

/**
 * 🔴 CRITIQUE - Gère l'échec d'un paiement
 * Restaure le stock réservé et initie un remboursement si nécessaire
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
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

		// 3. Transaction pour mettre à jour la commande ET restaurer le stock si nécessaire
		await prisma.$transaction(async (tx) => {
			// Mettre à jour le statut de la commande
			await tx.order.update({
				where: { id: orderId },
				data: {
					paymentStatus: "FAILED",
					status: "CANCELLED",
					stripePaymentIntentId: paymentIntent.id,
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
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
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

/**
 * 🔴 CRITIQUE - Gère l'expiration d'une session de checkout
 * Marque la commande comme annulée après expiration sans paiement
 *
 * Contexte :
 * - Sessions Stripe configurées pour expirer après 30 minutes
 * - Le stock n'est PAS décrémenté lors du create-checkout-session
 * - Le stock sera décrémenté seulement lors du paiement réussi (webhook checkout.session.completed)
 *
 * Cas d'usage :
 * - Utilisateur abandonne le paiement après création session
 * - Utilisateur laisse la page Stripe ouverte sans valider
 * - Problème technique empêchant le paiement
 */
async function handleCheckoutSessionExpired(
	session: Stripe.Checkout.Session
) {
	const orderId = session.metadata?.orderId || session.client_reference_id;

	if (!orderId) {
		console.error("❌ [WEBHOOK] No order ID found in expired checkout session");
		return;
	}

	console.log(`⏰ [WEBHOOK] Processing expired checkout session: ${session.id}, order: ${orderId}`);

	try {
		// Récupérer la commande pour vérifier son statut
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { paymentStatus: true, orderNumber: true },
		});

		if (!order) {
			console.warn(`⚠️  [WEBHOOK] Order not found for expired session: ${orderId}`);
			return;
		}

		// ✅ IDEMPOTENCE : Ne traiter que si la commande est toujours PENDING
		if (order.paymentStatus !== "PENDING") {
			console.log(
				`ℹ️  [WEBHOOK] Order ${orderId} already processed (status: ${order.paymentStatus}), skipping expiration`
			);
			return;
		}

		// Marquer la commande comme expirée/annulée
		await prisma.order.update({
			where: { id: orderId },
			data: {
				status: "CANCELLED",
				paymentStatus: "FAILED",
			},
		});

		console.log(`✅ [WEBHOOK] Order ${orderId} (${order.orderNumber}) marked as cancelled due to session expiration`);
	} catch (error) {
		console.error(
			`❌ [WEBHOOK] Error handling expired checkout session for order ${orderId}:`,
			error
		);
		throw error;
	}
}

/**
 * 💰 Gère les remboursements
 * Synchronise les remboursements Stripe avec la base de données
 * Gère aussi les remboursements effectués directement via le Dashboard Stripe
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
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

		// 3. Récupérer les derniers remboursements Stripe pour cette charge
		const stripeRefunds = charge.refunds?.data || [];

		for (const stripeRefund of stripeRefunds) {
			if (!stripeRefund.id) continue;

			// Vérifier si ce remboursement existe déjà dans notre base
			const existingRefund = order.refunds.find(
				(r) => r.stripeRefundId === stripeRefund.id
			);

			if (existingRefund) {
				// Mettre à jour le statut si nécessaire (ex: PENDING → COMPLETED)
				if (
					existingRefund.status !== RefundStatus.COMPLETED &&
					stripeRefund.status === "succeeded"
				) {
					await prisma.refund.update({
						where: { id: existingRefund.id },
						data: { status: RefundStatus.COMPLETED },
					});
					console.log(`✅ [WEBHOOK] Refund ${existingRefund.id} marked as COMPLETED`);
				}
			} else {
				// ⚠️ Remboursement fait depuis le Dashboard Stripe
				// Créer un enregistrement Refund pour la traçabilité comptable
				const refundId = stripeRefund.metadata?.refund_id;

				// Si on a un refund_id dans les métadonnées, c'est qu'il a été créé via notre app
				// mais n'a pas encore été lié - on le lie maintenant
				if (refundId) {
					await prisma.refund.update({
						where: { id: refundId },
						data: {
							stripeRefundId: stripeRefund.id,
							status: stripeRefund.status === "succeeded"
								? RefundStatus.COMPLETED
								: RefundStatus.PENDING,
							processedAt: new Date(),
						},
					});
					console.log(`✅ [WEBHOOK] Linked existing refund ${refundId} to Stripe refund ${stripeRefund.id}`);
				} else {
					// Remboursement fait entièrement depuis Stripe Dashboard
					// 🔴 UPSERT pour idempotence (Best Practice Stripe 2025)
					// Évite les doublons si le webhook est rejoué
					await prisma.refund.upsert({
						where: { stripeRefundId: stripeRefund.id },
						create: {
							orderId: order.id,
							stripeRefundId: stripeRefund.id,
							amount: stripeRefund.amount || 0,
							currency: "EUR", // ⚠️ AUDIT FIX: CurrencyCode enum
							reason: "OTHER",
							status: stripeRefund.status === "succeeded"
								? RefundStatus.COMPLETED
								: RefundStatus.PENDING,
							note: "Remboursement effectué via Dashboard Stripe",
							processedAt: new Date(),
						},
						update: {
							// Si existe déjà, mettre à jour le statut
							status: stripeRefund.status === "succeeded"
								? RefundStatus.COMPLETED
								: RefundStatus.PENDING,
							processedAt: new Date(),
						},
					});
					console.log(
						`⚠️ [WEBHOOK] Upserted refund record for Stripe Dashboard refund ${stripeRefund.id}`
					);
				}
			}
		}

		// 4. Calculer le total remboursé et mettre à jour le statut de paiement
		const totalRefundedOnStripe = charge.amount_refunded || 0;
		const isFullyRefunded = totalRefundedOnStripe >= order.total;
		const isPartiallyRefunded = totalRefundedOnStripe > 0 && totalRefundedOnStripe < order.total;

		if (isFullyRefunded && order.paymentStatus !== PaymentStatus.REFUNDED) {
			await prisma.order.update({
				where: { id: order.id },
				data: { paymentStatus: PaymentStatus.REFUNDED },
			});
			console.log(`✅ [WEBHOOK] Order ${order.orderNumber} marked as REFUNDED (total)`);
		} else if (isPartiallyRefunded && order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED && order.paymentStatus !== PaymentStatus.REFUNDED) {
			await prisma.order.update({
				where: { id: order.id },
				data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
			});
			console.log(`✅ [WEBHOOK] Order ${order.orderNumber} marked as PARTIALLY_REFUNDED (${totalRefundedOnStripe / 100}€ / ${order.total / 100}€)`);
		}

		console.log(
			`📄 [WEBHOOK] Refund processed for order ${order.orderNumber} ` +
			`(${isFullyRefunded ? 'total' : 'partial'}: ${totalRefundedOnStripe / 100}€)`
		);

		// 5. Envoyer email de confirmation au client
		if (order.customerEmail) {
			try {
				const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
				const orderDetailsUrl = `${baseUrl}/mon-compte/commandes/${order.orderNumber}`;

				// Déterminer la raison du dernier remboursement
				const latestRefund = stripeRefunds[0];
				const reason = latestRefund?.reason || "OTHER";

				await sendRefundConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName || "Client",
					refundAmount: totalRefundedOnStripe,
					originalOrderTotal: order.total,
					reason: reason.toUpperCase(),
					isPartialRefund: !isFullyRefunded,
					orderDetailsUrl,
				});

				console.log(`✅ [WEBHOOK] Refund confirmation email sent to ${order.customerEmail}`);
			} catch (emailError) {
				console.error("❌ [WEBHOOK] Error sending refund confirmation email:", emailError);
				// Ne pas bloquer le webhook si l'email échoue
			}
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling charge refunded:`, error);
		// Ne pas throw pour ne pas bloquer le webhook
	}
}

/**
 * 🏦 Gère les paiements asynchrones réussis (SEPA, Sofort, etc.)
 * Ces paiements sont confirmés après le checkout, parfois plusieurs jours plus tard
 */
async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
	console.log(`🏦 [WEBHOOK] Async payment succeeded: ${session.id}`);

	try {
		const orderId = session.metadata?.orderId || session.client_reference_id;

		if (!orderId) {
			console.error("❌ [WEBHOOK] No order ID found in async payment session");
			return;
		}

		// Traiter comme un checkout.session.completed
		// La logique est identique : mettre à jour le statut, décrémenter le stock, etc.
		await handleCheckoutSessionCompleted(session);

		console.log(`✅ [WEBHOOK] Async payment processed for order ${orderId}`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling async payment succeeded:`, error);
		throw error; // Propager pour marquer l'événement comme FAILED
	}
}

/**
 * 🚫 Gère les paiements asynchrones échoués
 * Annule la commande et notifie le client
 */
async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
	console.log(`🚫 [WEBHOOK] Async payment failed: ${session.id}`);

	try {
		const orderId = session.metadata?.orderId || session.client_reference_id;

		if (!orderId) {
			console.error("❌ [WEBHOOK] No order ID found in failed async payment session");
			return;
		}

		// Mettre à jour la commande comme échouée
		const order = await prisma.order.update({
			where: { id: orderId },
			data: {
				paymentStatus: PaymentStatus.FAILED,
				status: "CANCELLED",
			},
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				customerName: true,
			},
		});

		console.log(`⚠️ [WEBHOOK] Order ${order.orderNumber} marked as FAILED due to async payment failure`);

		// Envoyer un email au client pour l'informer de l'échec
		const retryUrl = `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://synclune.fr"}/creations`;
		await sendPaymentFailedEmail({
			to: order.customerEmail,
			customerName: order.customerName,
			orderNumber: order.orderNumber,
			retryUrl,
		});

	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling async payment failed:`, error);
		throw error;
	}
}

/**
 * ⚠️ Gère les litiges/chargebacks
 * CRITIQUE : Un chargeback peut coûter 15€+ de frais et entraîner des pénalités
 *
 * Actions requises :
 * 1. Alerter immédiatement l'admin
 * 2. Bloquer les nouvelles commandes du client (optionnel)
 * 3. Préparer les preuves (facture, tracking, emails)
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
	console.log(`⚠️ [WEBHOOK] Dispute created: ${dispute.id}`);

	try {
		// 1. Trouver la commande associée via le payment intent
		const paymentIntentId = typeof dispute.payment_intent === "string"
			? dispute.payment_intent
			: dispute.payment_intent?.id;

		if (!paymentIntentId) {
			console.error("❌ [WEBHOOK] No payment intent found for dispute");
			return;
		}

		const order = await prisma.order.findUnique({
			where: { stripePaymentIntentId: paymentIntentId },
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				customerName: true,
				total: true,
				stripeInvoiceId: true,
				trackingNumber: true,
				shippedAt: true,
				actualDelivery: true,
				user: {
					select: { id: true, email: true },
				},
			},
		});

		if (!order) {
			console.warn(`⚠️ [WEBHOOK] Order not found for disputed payment intent ${paymentIntentId}`);
			return;
		}

		// 2. Log pour traçabilité (Dashboard Stripe = source de vérité)
		console.log(`[AUDIT] Dispute created`, {
			orderId: order.id,
			orderNumber: order.orderNumber,
			disputeId: dispute.id,
			reason: dispute.reason,
			amount: dispute.amount,
			currency: dispute.currency,
			status: dispute.status,
			evidenceDueBy: dispute.evidence_details?.due_by
				? new Date(dispute.evidence_details.due_by * 1000).toISOString()
				: null,
		});

		// 3. Alerter l'admin par email
		const disputeAmount = dispute.amount / 100;
		const evidenceDueDate = dispute.evidence_details?.due_by
			? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("fr-FR")
			: "Non spécifiée";

		console.log(`
🚨🚨🚨 ALERTE LITIGE / CHARGEBACK 🚨🚨🚨

Commande: ${order.orderNumber}
Client: ${order.customerName} (${order.customerEmail})
Montant contesté: ${disputeAmount}€
Raison: ${dispute.reason || "Non spécifiée"}
Date limite pour preuves: ${evidenceDueDate}

ACTIONS REQUISES:
1. Rassembler les preuves de livraison (tracking, signature)
2. Préparer la facture Stripe
3. Répondre dans le Dashboard Stripe AVANT la date limite

Lien Dashboard: https://dashboard.stripe.com/disputes/${dispute.id}
		`);

		// 4. Envoyer un email d'alerte à l'admin
		try {
			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
			const dashboardUrl = `${baseUrl}/admin/ventes/commandes/${order.id}`;

			await sendAdminDisputeAlert({
				orderNumber: order.orderNumber,
				orderId: order.id,
				customerEmail: order.customerEmail || "Email non disponible",
				customerName: order.customerName || "Client",
				disputeAmount: dispute.amount,
				disputeReason: dispute.reason || "general",
				evidenceDueDate,
				stripeDisputeId: dispute.id,
				stripePaymentIntentId: paymentIntentId,
				dashboardUrl,
			});

			console.log(`✅ [WEBHOOK] Admin dispute alert email sent for order ${order.orderNumber}`);
		} catch (emailError) {
			console.error("❌ [WEBHOOK] Error sending admin dispute alert email:", emailError);
			// Ne pas bloquer le webhook si l'email échoue
		}

	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling dispute created:`, error);
		throw error; // Propager pour marquer l'événement comme FAILED
	}
}

// =============================================================================
// HANDLERS FACTURES STRIPE
// =============================================================================

/**
 * 📄 Gère la finalisation d'une facture Stripe
 * Stocke le invoiceNumber (numéro séquentiel Stripe) dans la commande
 *
 * Appelé quand une facture passe de DRAFT à OPEN ou PAID
 * Le numéro n'est attribué qu'à la finalisation (garantit la séquentialité)
 */
async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
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
async function handleInvoicePaid(invoice: Stripe.Invoice) {
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
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
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

// =============================================================================
// HANDLERS REFUND (API 2024-10-28+)
// =============================================================================

/**
 * 💰 Gère les événements refund.created et refund.updated
 * Synchronise le statut du remboursement avec la base de données
 */
async function handleRefundUpdated(stripeRefund: Stripe.Refund) {
	console.log(`💰 [WEBHOOK] Refund updated: ${stripeRefund.id}, status: ${stripeRefund.status}`);

	try {
		// 1. Trouver le remboursement local via stripeRefundId
		let refund = await prisma.refund.findUnique({
			where: { stripeRefundId: stripeRefund.id },
			select: {
				id: true,
				status: true,
				orderId: true,
				order: {
					select: { orderNumber: true },
				},
			},
		});

		// 2. Si pas trouvé via stripeRefundId, essayer via metadata
		if (!refund && stripeRefund.metadata?.refund_id) {
			refund = await prisma.refund.findUnique({
				where: { id: stripeRefund.metadata.refund_id },
				select: {
					id: true,
					status: true,
					orderId: true,
					order: {
						select: { orderNumber: true },
					},
				},
			});

			// Lier le stripeRefundId si trouvé
			if (refund) {
				await prisma.refund.update({
					where: { id: refund.id },
					data: { stripeRefundId: stripeRefund.id },
				});
			}
		}

		if (!refund) {
			console.log(`ℹ️ [WEBHOOK] Refund ${stripeRefund.id} not found in database (may be external)`);
			return;
		}

		// 3. Mapper le statut Stripe vers notre statut
		const statusMap: Record<string, RefundStatus> = {
			succeeded: RefundStatus.COMPLETED,
			pending: RefundStatus.APPROVED,
			failed: RefundStatus.FAILED,
			canceled: RefundStatus.CANCELLED,
		};

		const newStatus = statusMap[stripeRefund.status || "pending"];

		// 4. Mettre à jour si le statut a changé
		if (newStatus && refund.status !== newStatus) {
			await prisma.$transaction(async (tx) => {
				// Update refund status
				await tx.refund.update({
					where: { id: refund.id },
					data: {
						status: newStatus,
						processedAt: newStatus === RefundStatus.COMPLETED ? new Date() : undefined,
					},
				});

				// Ajouter à l'historique
				await tx.refundHistory.create({
					data: {
						refundId: refund.id,
						action: newStatus === RefundStatus.COMPLETED ? RefundAction.COMPLETED : RefundAction.FAILED,
						note: `Mis à jour via webhook Stripe (status: ${stripeRefund.status})`,
					},
				});
			});

			console.log(`✅ [WEBHOOK] Refund ${refund.id} status updated to ${newStatus}`);
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling refund updated:`, error);
		// Ne pas throw pour ne pas bloquer le webhook
	}
}

/**
 * ❌ Gère les échecs de remboursement
 * Marque le remboursement comme FAILED et alerte l'admin
 */
async function handleRefundFailed(stripeRefund: Stripe.Refund) {
	console.log(`❌ [WEBHOOK] Refund failed: ${stripeRefund.id}`);

	try {
		// 1. Trouver le remboursement local
		let refund = await prisma.refund.findUnique({
			where: { stripeRefundId: stripeRefund.id },
			select: {
				id: true,
				status: true,
				amount: true,
				orderId: true,
				order: {
					select: {
						id: true,
						orderNumber: true,
						customerEmail: true,
						stripePaymentIntentId: true,
					},
				},
			},
		});

		// 2. Si pas trouvé via stripeRefundId, essayer via metadata
		if (!refund && stripeRefund.metadata?.refund_id) {
			refund = await prisma.refund.findUnique({
				where: { id: stripeRefund.metadata.refund_id },
				select: {
					id: true,
					status: true,
					amount: true,
					orderId: true,
					order: {
						select: {
							id: true,
							orderNumber: true,
							customerEmail: true,
							stripePaymentIntentId: true,
						},
					},
				},
			});
		}

		if (!refund) {
			console.warn(`⚠️ [WEBHOOK] Failed refund ${stripeRefund.id} not found in database`);
			return;
		}

		// 3. Marquer comme FAILED avec historique
		await prisma.$transaction(async (tx) => {
			await tx.refund.update({
				where: { id: refund.id },
				data: { status: RefundStatus.FAILED },
			});

			await tx.refundHistory.create({
				data: {
					refundId: refund.id,
					action: RefundAction.FAILED,
					note: `Échec Stripe: ${stripeRefund.failure_reason || "Raison inconnue"}`,
				},
			});
		});

		console.log(`✅ [WEBHOOK] Refund ${refund.id} marked as FAILED`);

		// 4. Alerter l'admin
		try {
			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
			const dashboardUrl = `${baseUrl}/admin/ventes/remboursements`;

			await sendAdminRefundFailedAlert({
				orderNumber: refund.order.orderNumber,
				orderId: refund.order.id,
				customerEmail: refund.order.customerEmail || "Email non disponible",
				amount: refund.amount,
				reason: "other",
				errorMessage: `Échec remboursement Stripe: ${stripeRefund.failure_reason || "Raison inconnue"}`,
				stripePaymentIntentId: refund.order.stripePaymentIntentId || "",
				dashboardUrl,
			});

			console.log(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${refund.order.orderNumber}`);
		} catch (emailError) {
			console.error("❌ [WEBHOOK] Error sending refund failure alert:", emailError);
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling refund failed:`, error);
		// Ne pas throw pour ne pas bloquer le webhook
	}
}
