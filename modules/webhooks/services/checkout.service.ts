import Stripe from "stripe";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { batchValidateSkusForMerge } from "@/modules/cart/services/sku-validation.service";
import {
	getShippingRateName,
	getShippingMethodFromRate,
	getShippingCarrierFromRate,
} from "@/modules/orders/constants/stripe-shipping-rates";
import type { PostWebhookTask } from "../types/webhook.types";
import type { OrderWithItems } from "../types/checkout.types";
import { getBaseUrl } from "@/shared/constants/urls";

/**
 * Mappe un order Prisma vers OrderWithItems
 * Évite les type assertions dangereuses (as unknown as)
 */
function mapToOrderWithItems(order: {
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
	items: Array<{
		productTitle: string | null;
		skuColor: string | null;
		skuMaterial: string | null;
		skuSize: string | null;
		quantity: number;
		price: number;
		skuId: string;
		sku: { id: string; inventory: number; sku: string } | null;
	}>;
}): OrderWithItems {
	return {
		id: order.id,
		orderNumber: order.orderNumber,
		userId: order.userId,
		shippingFirstName: order.shippingFirstName,
		shippingLastName: order.shippingLastName,
		shippingAddress1: order.shippingAddress1,
		shippingAddress2: order.shippingAddress2,
		shippingPostalCode: order.shippingPostalCode,
		shippingCity: order.shippingCity,
		shippingCountry: order.shippingCountry,
		shippingPhone: order.shippingPhone,
		subtotal: order.subtotal,
		discountAmount: order.discountAmount,
		shippingCost: order.shippingCost,
		taxAmount: order.taxAmount,
		total: order.total,
		items: order.items.map((item) => ({
			productTitle: item.productTitle,
			skuColor: item.skuColor,
			skuMaterial: item.skuMaterial,
			skuSize: item.skuSize,
			quantity: item.quantity,
			price: item.price,
			skuId: item.skuId,
			sku: item.sku,
		})),
	};
}

/**
 * Récupère les informations de livraison depuis la session Stripe
 */
export async function extractShippingInfo(
	session: Stripe.Checkout.Session
): Promise<{ shippingCost: number; shippingMethod: string; shippingRateId: string | undefined }> {
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

		// P1.1: Vérifier que l'email Stripe correspond à la commande (anti-fraude)
		const stripeEmail = session.customer_email || session.customer_details?.email;
		if (stripeEmail && order.customerEmail && stripeEmail.toLowerCase() !== order.customerEmail.toLowerCase()) {
			console.warn(`⚠️ [WEBHOOK] Email mismatch for order ${orderId}: Stripe=${stripeEmail}, Order=${order.customerEmail}`);
			// On log mais on ne bloque pas (guest checkout peut changer d'email)
		}

		// 2. Vérifier l'idempotence - Si déjà traité, on skip
		if (order.paymentStatus === "PAID") {
			console.log(`⚠️  [WEBHOOK] Order ${orderId} already processed, skipping`);
			return mapToOrderWithItems(order);
		}

		// 3. Re-validation of all items BEFORE marking as PAID (single batch query)
		console.log(`🔍 [WEBHOOK] Re-validating ${order.items.length} items for order ${orderId}`);

		const batchResults = await batchValidateSkusForMerge(
			order.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity }))
		);

		for (const item of order.items) {
			const result = batchResults.get(item.skuId);
			if (!result || !result.isValid) {
				const reason = !result ? "SKU not found" : `invalid (active=${result.isActive}, stock=${result.inventory})`;
				console.error(
					`❌ [WEBHOOK] Validation failed for order ${orderId}, SKU ${item.skuId}: ${reason}`
				);
				throw new Error(
					`Invalid item in order: ${reason} (SKU: ${item.skuId}, Quantity: ${item.quantity})`
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

		// 5b. Deactivate out-of-stock SKUs (single query instead of N+1)
		const skuIds = order.items.map((item) => item.skuId);
		const { count: deactivatedCount } = await tx.productSku.updateMany({
			where: { id: { in: skuIds }, inventory: 0 },
			data: { isActive: false },
		});
		if (deactivatedCount > 0) {
			console.log(`📦 [WEBHOOK] ${deactivatedCount} SKU(s) deactivated (out of stock) for order ${orderId}`);
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

		return mapToOrderWithItems(order);
	}, { timeout: 10000 });
}

/**
 * Construit les tâches post-webhook pour une commande réussie
 */
export function buildPostCheckoutTasks(
	order: OrderWithItems,
	session: Stripe.Checkout.Session
): PostWebhookTask[] {
	const tasks: PostWebhookTask[] = [];
	const baseUrl = getBaseUrl();

	// 1. Invalider les caches (panier, commandes user, stats compte)
	const cacheTags: string[] = [];

	if (order.userId) {
		// Panier de l'utilisateur
		cacheTags.push(...getCartInvalidationTags(order.userId, undefined));

		// Commandes de l'utilisateur (inclut LAST_ORDER et ACCOUNT_STATS)
		cacheTags.push(...getOrderInvalidationTags(order.userId));
	}

	// Stock temps réel des SKUs achetés
	for (const item of order.items) {
		if (item.sku?.id) {
			cacheTags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(item.sku.id));
		}
	}

	if (cacheTags.length > 0) {
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
			},
		});
	}

	// 3. Notifier l'admin
	const dashboardUrl = `${baseUrl}/dashboard/orders/${order.id}`;

	tasks.push({
		type: "ADMIN_NEW_ORDER_EMAIL",
		data: {
			orderNumber: order.orderNumber,
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

	// Release discount usages + cancel order in a single interactive transaction
	// The findMany MUST be inside the transaction to prevent double-decrement on webhook replay
	await prisma.$transaction(async (tx) => {
		const discountUsages = await tx.discountUsage.findMany({
			where: { orderId },
			select: { id: true, discountId: true },
		});

		for (const usage of discountUsages) {
			await tx.discount.update({
				where: { id: usage.discountId },
				data: { usageCount: { decrement: 1 } },
			});
		}

		if (discountUsages.length > 0) {
			await tx.discountUsage.deleteMany({ where: { orderId } });
		}

		await tx.order.update({
			where: { id: orderId },
			data: {
				status: "CANCELLED",
				paymentStatus: "FAILED",
			},
		});

		if (discountUsages.length > 0) {
			console.log(`🔓 [WEBHOOK] Released ${discountUsages.length} discount usage(s) for expired order ${orderId}`);
		}
	});

	console.log(`✅ [WEBHOOK] Order ${orderId} (${order.orderNumber}) marked as cancelled due to session expiration`);
	return { cancelled: true, orderNumber: order.orderNumber };
}
