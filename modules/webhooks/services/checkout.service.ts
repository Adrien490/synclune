import Stripe from "stripe";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { validateSkuAndStock } from "@/modules/cart/lib/sku-validation";
import {
	getShippingRateName,
	getShippingMethodFromRate,
	getShippingCarrierFromRate,
} from "@/modules/orders/constants/stripe-shipping-rates";
import type { PostWebhookTask } from "../types/webhook.types";

// Types pour les résultats des services
export interface ProcessCheckoutResult {
	order: OrderWithItems;
	tasks: PostWebhookTask[];
}

interface OrderWithItems {
	id: string;
	orderNumber: string;
	userId: string | null;
	shippingFirstName: string | null;
	shippingLastName: string | null;
	shippingAddress1: string | null;
	shippingAddress2: string | null;
	shippingPostalCode: string | null;
	shippingCity: string | null;
	shippingCountry: string | null;
	shippingPhone: string | null;
	subtotal: number;
	discountAmount: number;
	shippingCost: number;
	taxAmount: number;
	total: number;
	items: OrderItem[];
}

interface OrderItem {
	productTitle: string | null;
	skuColor: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	quantity: number;
	price: number;
	skuId: string;
	sku: {
		id: string;
		inventory: number;
		sku: string;
	} | null;
}

/**
 * Récupère les informations de livraison depuis la session Stripe
 */
export async function extractShippingInfo(
	session: Stripe.Checkout.Session
): Promise<{ shippingCost: number; shippingMethod: string; shippingRateId: string | undefined }> {
	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

	const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
		expand: ["shipping_cost.shipping_rate"],
	});

	const shippingCost = fullSession.total_details?.amount_shipping || 0;
	const shippingRateId =
		typeof fullSession.shipping_cost?.shipping_rate === "string"
			? fullSession.shipping_cost.shipping_rate
			: fullSession.shipping_cost?.shipping_rate?.id;

	const shippingMethod = shippingRateId
		? getShippingRateName(shippingRateId)
		: "Livraison standard";

	return { shippingCost, shippingMethod, shippingRateId };
}

/**
 * Traite la commande dans une transaction atomique :
 * - Valide le stock de tous les SKUs
 * - Décrémente l'inventaire
 * - Met à jour le statut de la commande
 * - Désactive les SKUs épuisés
 * - Vide le panier de l'utilisateur
 */
export async function processOrderTransaction(
	orderId: string,
	session: Stripe.Checkout.Session,
	shippingCost: number,
	shippingRateId: string | undefined
): Promise<OrderWithItems> {
	return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
					select: { id: true },
				},
			},
		});

		if (!order) {
			throw new Error(`Order not found: ${orderId}`);
		}

		// 2. Vérifier l'idempotence - Si déjà traité, on skip
		if (order.paymentStatus === "PAID") {
			console.log(`⚠️  [WEBHOOK] Order ${orderId} already processed, skipping`);
			return order as unknown as OrderWithItems;
		}

		// 3. Re-validation de tous les items AVANT de marquer comme PAID
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
				data: { inventory: { decrement: item.quantity } },
			});
		}

		console.log(`✅ [WEBHOOK] Stock decremented for order ${orderId}`);

		// 5. Mettre à jour la commande avec infos shipping
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
				shippingMethod: getShippingMethodFromRate(shippingRateId || ""),
				shippingCarrier: getShippingCarrierFromRate(shippingRateId || ""),
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

		// 6. Vider le panier apres paiement reussi (utilisateur connecte OU invite)
		if (order.userId) {
			await tx.cartItem.deleteMany({
				where: { cart: { userId: order.userId } },
			});
			console.log(`🧹 [WEBHOOK] Cart cleared for user ${order.userId} after successful payment`);
		} else {
			// Invite : recuperer le sessionId depuis les metadata Stripe
			const guestSessionId = session.metadata?.guestSessionId;
			if (guestSessionId) {
				await tx.cartItem.deleteMany({
					where: { cart: { sessionId: guestSessionId } },
				});
				console.log(`🧹 [WEBHOOK] Cart cleared for guest session ${guestSessionId} after successful payment`);
			}
		}

		console.log("✅ [WEBHOOK] Order processed successfully:", order.orderNumber);

		return order as unknown as OrderWithItems;
	});
}

/**
 * Construit les tâches post-webhook pour une commande réussie
 */
export function buildPostCheckoutTasks(
	order: OrderWithItems,
	session: Stripe.Checkout.Session
): PostWebhookTask[] {
	const tasks: PostWebhookTask[] = [];
	const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";

	// 1. Invalider le cache du panier
	if (order.userId) {
		const cacheTags = getCartInvalidationTags(order.userId, undefined);
		tasks.push({ type: "INVALIDATE_CACHE", tags: cacheTags });
	}

	// 2. Email de confirmation au client
	const customerEmail = session.customer_email || session.customer_details?.email;
	if (customerEmail) {
		const trackingUrl = `${baseUrl}/orders`;

		tasks.push({
			type: "ORDER_CONFIRMATION_EMAIL",
			data: {
				to: customerEmail,
				orderNumber: order.orderNumber,
				customerName: `${order.shippingFirstName || ""} ${order.shippingLastName || ""}`.trim() || "Client",
				items: order.items.map((item) => ({
					productTitle: item.productTitle || "Produit",
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
					firstName: order.shippingFirstName || "",
					lastName: order.shippingLastName || "",
					address1: order.shippingAddress1 || "",
					address2: order.shippingAddress2,
					postalCode: order.shippingPostalCode || "",
					city: order.shippingCity || "",
					country: order.shippingCountry || "",
				},
				trackingUrl,
				orderId: order.id,
			},
		});
	}

	// 3. Notifier l'admin
	const dashboardUrl = `${baseUrl}/dashboard/orders/${order.id}`;

	tasks.push({
		type: "ADMIN_NEW_ORDER_EMAIL",
		data: {
			orderNumber: order.orderNumber,
			orderId: order.id,
			customerName: `${order.shippingFirstName || ""} ${order.shippingLastName || ""}`.trim() || "Client",
			customerEmail: customerEmail || "Email non disponible",
			items: order.items.map((item) => ({
				productTitle: item.productTitle || "Produit",
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
				firstName: order.shippingFirstName || "",
				lastName: order.shippingLastName || "",
				address1: order.shippingAddress1 || "",
				address2: order.shippingAddress2,
				postalCode: order.shippingPostalCode || "",
				city: order.shippingCity || "",
				country: order.shippingCountry || "",
				phone: order.shippingPhone || "",
			},
			dashboardUrl,
			stripePaymentIntentId: session.payment_intent as string,
		},
	});

	return tasks;
}

/**
 * Marque une commande comme expirée/annulée
 */
export async function cancelExpiredOrder(orderId: string): Promise<{ cancelled: boolean; orderNumber?: string }> {
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: { paymentStatus: true, orderNumber: true },
	});

	if (!order) {
		console.warn(`⚠️  [WEBHOOK] Order not found for expired session: ${orderId}`);
		return { cancelled: false };
	}

	// Idempotence : Ne traiter que si la commande est toujours PENDING
	if (order.paymentStatus !== "PENDING") {
		console.log(
			`ℹ️  [WEBHOOK] Order ${orderId} already processed (status: ${order.paymentStatus}), skipping expiration`
		);
		return { cancelled: false, orderNumber: order.orderNumber };
	}

	await prisma.order.update({
		where: { id: orderId },
		data: {
			status: "CANCELLED",
			paymentStatus: "FAILED",
		},
	});

	console.log(`✅ [WEBHOOK] Order ${orderId} (${order.orderNumber}) marked as cancelled due to session expiration`);
	return { cancelled: true, orderNumber: order.orderNumber };
}
