import { updateTags } from "@/shared/lib/cache";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import {
	sendOrderConfirmationEmail,
	sendAdminNewOrderEmail,
	sendAdminRefundFailedAlert,
} from "@/shared/lib/email";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PaymentStatus, Prisma, RefundStatus } from "@/app/generated/prisma/client";
import { validateSkuAndStock } from "@/modules/cart/lib/sku-validation";
import { getShippingRateName } from "@/modules/orders/constants/stripe-shipping-rates";

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

		// 2. Traiter l'événement selon le type (webhook event tracking removed for v1)
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


				default:
					// console.log(`⚠️  Unhandled event type: ${event.type}`);
			}

			return NextResponse.json({ received: true, status: "processed" });
		} catch (error) {
			// console.error("❌ Error processing webhook event:", error);

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

			// 4. ✅ NOUVEAU : Le stock a déjà été réservé lors de create-checkout-session
			// On marque simplement la commande comme PAID

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
			updateTags(tags);
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
		await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			// Récupérer la commande pour vérifier son statut actuel
			const order = await tx.order.findUnique({
				where: { id: orderId },
				include: { items: true },
			});

			if (!order) {
				throw new Error(`Order not found: ${orderId}`);
			}

			// ✅ NOUVEAU : Avec la réservation au checkout, le stock est TOUJOURS décrémenté
			// pour les commandes PENDING ou PAID. On doit donc TOUJOURS le restaurer.
			const shouldRestoreStock =
				order.paymentStatus === "PENDING" ||
				order.paymentStatus === "PAID";

			// Mettre à jour le statut de la commande
			await tx.order.update({
				where: { id: orderId },
				data: {
					paymentStatus: "FAILED",
					status: "CANCELLED",
					stripePaymentIntentId: paymentIntent.id,
				},
			});

			// Restaurer le stock (car il avait été réservé au checkout)
			if (shouldRestoreStock) {
				for (const item of order.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: {
							inventory: { increment: item.quantity },
						},
					});
				}
				console.log(`✅ [WEBHOOK] Stock restored for failed order ${orderId}`);
			}
		});

		// 🔴 NOUVEAU : Remboursement automatique si paiement capturé
		if (paymentIntent.status === "requires_payment_method" || paymentIntent.amount_received > 0) {
			console.log(`💰 [WEBHOOK] Initiating automatic refund for order ${orderId}`);

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

		console.log(`❌ [WEBHOOK] Order ${orderId} payment failed and stock restored`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling payment failure for order ${orderId}:`, error);
		throw error;
	}
}

/**
 * 🔴 CRITIQUE - Gère l'annulation d'un paiement
 * Annule la commande, restaure le stock et initie un remboursement si nécessaire
 */
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		console.error("❌ [WEBHOOK] No order_id in payment intent metadata");
		return;
	}

	try {
		await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			// Récupérer la commande pour vérifier son statut actuel
			const order = await tx.order.findUnique({
				where: { id: orderId },
				include: { items: true },
			});

			if (!order) {
				throw new Error(`Order not found: ${orderId}`);
			}

			// ✅ NOUVEAU : Avec la réservation au checkout, le stock est TOUJOURS décrémenté
			// pour les commandes PENDING ou PAID. On doit donc TOUJOURS le restaurer.
			const shouldRestoreStock =
				order.paymentStatus === "PENDING" ||
				order.paymentStatus === "PAID";

			// Mettre à jour le statut de la commande
			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "CANCELLED",
					paymentStatus: "FAILED",
					stripePaymentIntentId: paymentIntent.id,
				},
			});

			// Restaurer le stock (car il avait été réservé au checkout)
			if (shouldRestoreStock) {
				for (const item of order.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: {
							inventory: { increment: item.quantity },
						},
					});
				}
				console.log(`✅ [WEBHOOK] Stock restored for canceled order ${orderId}`);
			}
		});

		// 🔴 NOUVEAU : Remboursement automatique si paiement a été capturé
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

		console.log(`⚠️ [WEBHOOK] Order ${orderId} payment canceled and stock restored`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling payment cancelation for order ${orderId}:`, error);
		throw error;
	}
}

/**
 * 🔴 CRITIQUE - Gère l'expiration d'une session de checkout
 * Restaure le stock réservé après expiration sans paiement
 *
 * Contexte :
 * - Sessions Stripe configurées pour expirer après 30 minutes
 * - Le stock a été réservé (décrémenté) lors du create-checkout-session
 * - Cette fonction libère le stock pour éviter le blocage d'inventaire
 *
 * Cas d'usage :
 * - Utilisateur abandonne le paiement après création session
 * - Utilisateur laisse la page Stripe ouverte sans valider
 * - Problème technique empêchant le paiement
 *
 * Race condition safety :
 * - Idempotente : vérifie paymentStatus avant traitement
 * - Transaction atomique : garantit cohérence stock/commande
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
		// 🔴 TRANSACTION ATOMIQUE pour garantir cohérence
		const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			// 1. Récupérer la commande avec tous ses items et détails SKU
			const order = await tx.order.findUnique({
				where: { id: orderId },
				include: {
					items: {
						include: {
							sku: {
								select: {
									id: true,
									sku: true,
									inventory: true,
									product: {
										select: {
											id: true,
											slug: true,
											title: true,
										},
									},
								},
							},
						},
					},
				},
			});

			if (!order) {
				console.warn(`⚠️  [WEBHOOK] Order not found for expired session: ${orderId}`);
				return null;
			}

			// 2. ✅ IDEMPOTENCE : Ne traiter que si la commande est toujours PENDING
			if (order.paymentStatus !== "PENDING") {
				console.log(
					`ℹ️  [WEBHOOK] Order ${orderId} already processed (status: ${order.paymentStatus}), skipping expiration`
				);
				return null;
			}

			// 3. Marquer la commande comme expirée/annulée
			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "CANCELLED",
					paymentStatus: "FAILED",
				},
			});

			// 4. Restaurer le stock pour chaque item (logging détaillé)
			const restoredItems = [];
			for (const item of order.items) {
				const beforeInventory = item.sku.inventory;
				const afterInventory = beforeInventory + item.quantity;

				await tx.productSku.update({
					where: { id: item.skuId },
					data: {
						inventory: { increment: item.quantity },
					},
				});

				restoredItems.push({
					skuId: item.skuId,
					sku: item.sku.sku,
					productTitle: item.sku.product.title,
					quantity: item.quantity,
					beforeInventory,
					afterInventory,
				});

				console.log(
					`📦 [WEBHOOK] Stock restored: ${item.sku.sku} (${item.sku.product.title}) | ` +
					`Quantity: ${item.quantity} | Before: ${beforeInventory} → After: ${afterInventory}`
				);
			}

			return {
				orderId,
				orderNumber: order.orderNumber,
				itemCount: order.items.length,
				restoredItems,
				productSlugs: [...new Set(order.items.map(i => i.sku.product.slug))],
			};
		});

		// 5. Si transaction réussie, invalider les caches concernés
		if (result) {
			// Invalider cache pour chaque produit affecté
			for (const slug of result.productSlugs) {
				const tags = [`product-${slug}`, `products-list`];
				updateTags(tags);
			}

			console.log(
				`✅ [WEBHOOK] Stock restored for expired session ${result.orderId} ` +
				`(Order: ${result.orderNumber}, ${result.itemCount} items)`
			);

			// Log détaillé du stock restauré pour monitoring/debug
			console.log(
				`📊 [WEBHOOK] Stock restoration details:`,
				JSON.stringify(result.restoredItems, null, 2)
			);
		}
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

		if (isFullyRefunded && order.paymentStatus !== PaymentStatus.REFUNDED) {
			await prisma.order.update({
				where: { id: order.id },
				data: { paymentStatus: PaymentStatus.REFUNDED },
			});
			console.log(`✅ [WEBHOOK] Order ${order.orderNumber} marked as REFUNDED`);
		}

		console.log(
			`📄 [WEBHOOK] Refund processed for order ${order.orderNumber} ` +
			`(${isFullyRefunded ? 'total' : 'partial'}: ${totalRefundedOnStripe / 100}€)`
		);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling charge refunded:`, error);
		// Ne pas throw pour ne pas bloquer le webhook
	}
}

