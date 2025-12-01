import Stripe from "stripe";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { validateSkuAndStock } from "@/modules/cart/lib/sku-validation";
import { getShippingRateName, getShippingMethodFromRate, getShippingCarrierFromRate } from "@/modules/orders/constants/stripe-shipping-rates";
import type { PostWebhookTask, WebhookHandlerResult } from "../types/webhook.types";

/**
 * Gère la complétion d'une session checkout
 * C'est le handler principal qui traite les paiements réussis
 */
export async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult | null> {
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
					// Mapping dynamique basé sur le shipping rate sélectionné
					shippingMethod: getShippingMethodFromRate(shippingRateId || ""),
					shippingCarrier: getShippingCarrierFromRate(shippingRateId || ""),
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
 * Gère l'expiration d'une session de checkout
 * Marque la commande comme annulée après expiration sans paiement
 *
 * Contexte :
 * - Sessions Stripe configurées pour expirer après 30 minutes
 * - Le stock n'est PAS décrémenté lors du create-checkout-session
 * - Le stock sera décrémenté seulement lors du paiement réussi (webhook checkout.session.completed)
 */
export async function handleCheckoutSessionExpired(
	session: Stripe.Checkout.Session
): Promise<void> {
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
