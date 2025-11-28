import { updateTag } from "next/cache";
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
import { PaymentStatus, Prisma, RefundStatus, WebhookEventStatus } from "@/app/generated/prisma/client";
import { validateSkuAndStock } from "@/modules/cart/lib/sku-validation";
import { getShippingRateName } from "@/modules/orders/constants/stripe-shipping-rates";

// Événements critiques qui nécessitent une déduplication stricte
const CRITICAL_EVENTS = [
	"checkout.session.completed",
	"checkout.session.async_payment_succeeded",
	"checkout.session.async_payment_failed",
	"charge.refunded",
	"charge.dispute.created",
	// Webhooks factures pour synchronisation invoiceNumber et statut
	"invoice.paid",
	"invoice.payment_failed",
	"invoice.finalized",
] as const;

// Note: With cacheComponents enabled, API routes are dynamic by default
// No need for export const dynamic = "force-dynamic"

/**
 * 🔴 CRITIQUE - Webhook Stripe avec Idempotence
 *
 * Gère les événements Stripe de manière idempotente pour éviter le traitement double.
 * Conforme aux meilleures pratiques 2025 :
 * - Vérification de signature
 * - Déduplication via stripeEventId
 * - Réponse immédiate (< 5s)
 * - Traitement transactionnel
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

		// console.log("✅ Stripe webhook event received:", event.type, event.id);

		// 2. 🔴 DÉDUPLICATION - Vérifier si l'événement a déjà été traité
		// Stripe peut renvoyer le même événement plusieurs fois (timeout, retry)
		const isCriticalEvent = CRITICAL_EVENTS.includes(event.type as typeof CRITICAL_EVENTS[number]);

		if (isCriticalEvent) {
			const existingEvent = await prisma.stripeWebhookEvent.findUnique({
				where: { stripeEventId: event.id },
			});

			if (existingEvent) {
				// Événement déjà traité ou en cours
				if (existingEvent.status === WebhookEventStatus.PROCESSED) {
					console.log(`⚠️ [WEBHOOK] Event ${event.id} already processed, skipping`);
					return NextResponse.json({ received: true, status: "already_processed" });
				}
				if (existingEvent.status === WebhookEventStatus.PENDING) {
					console.log(`⚠️ [WEBHOOK] Event ${event.id} already being processed, skipping`);
					return NextResponse.json({ received: true, status: "processing" });
				}
				// Si FAILED, on peut retenter (incrémenter retryCount)
			}

			// Enregistrer l'événement comme PENDING avant traitement
			await prisma.stripeWebhookEvent.upsert({
				where: { stripeEventId: event.id },
				create: {
					stripeEventId: event.id,
					type: event.type,
					status: WebhookEventStatus.PENDING,
					// Convertir l'objet Stripe en JSON sérialisable
					payload: JSON.parse(JSON.stringify(event.data.object)),
				},
				update: {
					status: WebhookEventStatus.PENDING,
					retryCount: { increment: 1 },
				},
			});
		}

		// 3. Traiter l'événement selon le type
		try {
			switch (event.type) {
				case "checkout.session.completed": {
					const session = event.data.object as Stripe.Checkout.Session;
					await handleCheckoutSessionCompleted(session);
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

			// 4. Marquer l'événement comme traité avec succès
			if (isCriticalEvent) {
				await prisma.stripeWebhookEvent.update({
					where: { stripeEventId: event.id },
					data: {
						status: WebhookEventStatus.PROCESSED,
						processedAt: new Date(),
					},
				});
			}

			return NextResponse.json({ received: true, status: "processed" });
		} catch (error) {
			// console.error("❌ Error processing webhook event:", error);

			// Marquer l'événement comme échoué
			if (isCriticalEvent) {
				await prisma.stripeWebhookEvent.update({
					where: { stripeEventId: event.id },
					data: {
						status: WebhookEventStatus.FAILED,
						errorMessage: error instanceof Error ? error.message : "Unknown error",
					},
				}).catch(() => {
					// Ignorer les erreurs de mise à jour (l'événement peut ne pas exister)
				});
			}

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
) {
	// console.log("🎉 Checkout session completed:", session.id);

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
			return;
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
					// ✅ Méthode de livraison (Colissimo France/Europe/DOM-TOM/Gratuit)
					shippingMethod,
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

		// 7. Invalider le cache du panier pour mise à jour immédiate côté client
		if (order?.userId) {
			const tags = getCartInvalidationTags(order.userId, undefined);
			tags.forEach(tag => updateTag(tag));
		}

		// 8. Récupérer l'email du client depuis la session Stripe
		const customerEmail = session.customer_email || session.customer_details?.email;

		// ✅ FACTURE AUTOMATIQUE : Stripe génère automatiquement la facture PDF
		// via invoice_creation dans Checkout Session (create-checkout-session.ts:545)
		// La facture est disponible dans le Dashboard Stripe et envoyée au client par email
		console.log(`📄 [WEBHOOK] Invoice automatically generated by Stripe for order ${order.orderNumber}`);
		const invoiceGenerated = true;

		// 9. Envoyer email de confirmation au client
		if (customerEmail) {
			try {
				const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
				const trackingUrl = `${baseUrl}/orders`;

				await sendOrderConfirmationEmail({
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
				});
			} catch (emailError) {
				console.error("❌ [WEBHOOK] Error sending customer confirmation email:", emailError);
				// Ne pas bloquer le webhook si l'email échoue
			}
		}

		// 10. Notifier l'admin
		try {
			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
			const dashboardUrl = `${baseUrl}/dashboard/orders/${order.id}`;

			await sendAdminNewOrderEmail({
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
			});
		} catch (emailError) {
			console.error("❌ [WEBHOOK] Error sending admin notification email:", emailError);
			// Ne pas bloquer le webhook si l'email échoue
		}
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

			// Audit trail
			await tx.orderStatusHistory.create({
				data: {
					orderId,
					field: "status",
					previousStatus: order.status,
					newStatus: "CANCELLED",
					changedBy: "webhook:payment_intent.payment_failed",
					reason: "Échec du paiement",
				},
			});

			await tx.orderStatusHistory.create({
				data: {
					orderId,
					field: "paymentStatus",
					previousStatus: order.paymentStatus,
					newStatus: "FAILED",
					changedBy: "webhook:payment_intent.payment_failed",
					reason: `PaymentIntent: ${paymentIntent.id}`,
				},
			});
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
					// Créer un Refund générique pour garder la cohérence comptable
					await prisma.refund.create({
						data: {
							orderId: order.id,
							stripeRefundId: stripeRefund.id,
							amount: stripeRefund.amount || 0,
							currency: stripeRefund.currency || "eur",
							reason: "OTHER",
							status: stripeRefund.status === "succeeded"
								? RefundStatus.COMPLETED
								: RefundStatus.PENDING,
							note: "Remboursement effectué via Dashboard Stripe",
							processedAt: new Date(),
						},
					});
					console.log(
						`⚠️ [WEBHOOK] Created refund record for Stripe Dashboard refund ${stripeRefund.id}`
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

		// Enregistrer dans l'historique des statuts
		await prisma.orderStatusHistory.create({
			data: {
				orderId: order.id,
				field: "paymentStatus",
				previousStatus: "PENDING",
				newStatus: "FAILED",
				changedBy: "webhook:checkout.session.async_payment_failed",
				reason: "Paiement asynchrone échoué (virement SEPA rejeté ou autre)",
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

		// 2. Créer un enregistrement d'audit pour le litige
		await prisma.auditLog.create({
			data: {
				entityType: "Order",
				entityId: order.id,
				action: "dispute_created",
				newData: {
					disputeId: dispute.id,
					reason: dispute.reason,
					amount: dispute.amount,
					currency: dispute.currency,
					status: dispute.status,
					evidenceDueBy: dispute.evidence_details?.due_by
						? new Date(dispute.evidence_details.due_by * 1000).toISOString()
						: null,
				},
				changedBy: "webhook:charge.dispute.created",
				source: "webhook",
			},
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

		// Logger dans AuditLog pour traçabilité
		await prisma.auditLog.create({
			data: {
				entityType: "Order",
				entityId: order.id,
				action: "invoice_payment_failed",
				newData: {
					invoiceId: invoice.id,
					invoiceNumber: invoice.number,
					attemptCount: invoice.attempt_count,
					nextPaymentAttempt: invoice.next_payment_attempt
						? new Date(invoice.next_payment_attempt * 1000).toISOString()
						: null,
				},
				changedBy: "webhook:invoice.payment_failed",
				source: "webhook",
			},
		});

		console.log(`⚠️ [WEBHOOK] Invoice payment failed for order ${order.orderNumber}`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling invoice payment failed:`, error);
		throw error;
	}
}
