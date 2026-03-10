import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import { type Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import {
	getShippingRateName,
	getShippingMethodFromRate,
	getShippingCarrierFromRate,
} from "@/modules/orders/constants/stripe-shipping-rates";
import type { PostWebhookTask } from "../types/webhook.types";
import type { OrderWithItems } from "../types/checkout.types";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";

/**
 * Maps a Prisma order to OrderWithItems.
 * Avoids dangerous type assertions (as unknown as).
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
 * Extracts shipping info from a Stripe Checkout Session.
 */
export async function extractShippingInfo(
	session: Stripe.Checkout.Session,
): Promise<{ shippingCost: number; shippingMethod: string; shippingRateId: string | undefined }> {
	try {
		const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
			expand: ["shipping_cost.shipping_rate"],
		});

		const shippingCost = fullSession.total_details?.amount_shipping ?? 0;
		const shippingRateId =
			typeof fullSession.shipping_cost?.shipping_rate === "string"
				? fullSession.shipping_cost.shipping_rate
				: fullSession.shipping_cost?.shipping_rate?.id;

		const shippingMethod = shippingRateId
			? getShippingRateName(shippingRateId)
			: "Livraison standard";

		return { shippingCost, shippingMethod, shippingRateId };
	} catch (error) {
		logger.error(
			`❌ [WEBHOOK] Failed to retrieve shipping info for session ${session.id}:`,
			error,
			{ service: "webhook" },
		);
		// Fallback to session-level data if Stripe API fails
		const shippingCost = session.total_details?.amount_shipping ?? 0;
		return { shippingCost, shippingMethod: "Livraison standard", shippingRateId: undefined };
	}
}

/**
 * Processes order from a Checkout Session in an atomic transaction:
 * - Validates stock for all SKUs
 * - Decrements inventory
 * - Updates order status
 * - Deactivates out-of-stock SKUs
 * - Clears user cart
 */
export async function processOrderTransaction(
	orderId: string,
	session: Stripe.Checkout.Session,
	shippingCost: number,
	shippingRateId: string | undefined,
): Promise<OrderWithItems> {
	return prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			// 1. Fetch order with items and SKUs
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

			// 2. Idempotence check
			if (order.paymentStatus === "PAID") {
				logger.info(`⚠️  [WEBHOOK] Order ${orderId} already processed, skipping`, {
					service: "webhook",
				});
				return mapToOrderWithItems(order);
			}

			// 3. Re-validate all items INSIDE the transaction to prevent race conditions
			logger.info(`[WEBHOOK] Re-validating ${order.items.length} items for order ${orderId}`, {
				service: "webhook",
			});

			const skuIds = order.items.map((item) => item.skuId);
			const skus = await tx.$queryRaw<
				Array<{
					id: string;
					inventory: number;
					isActive: boolean;
					deletedAt: Date | null;
					productStatus: string;
					productDeletedAt: Date | null;
				}>
			>`
				SELECT ps.id, ps.inventory, ps."isActive", ps."deletedAt",
				       p.status as "productStatus", p."deletedAt" as "productDeletedAt"
				FROM "ProductSku" ps
				INNER JOIN "Product" p ON ps."productId" = p.id
				WHERE ps.id = ANY(${skuIds}::text[])
				FOR UPDATE
			`;
			const skuMap = new Map(skus.map((s) => [s.id, s]));

			for (const item of order.items) {
				const sku = skuMap.get(item.skuId);
				const isValid =
					sku &&
					!sku.deletedAt &&
					!sku.productDeletedAt &&
					sku.isActive &&
					sku.productStatus === "PUBLIC" &&
					sku.inventory >= item.quantity;

				if (!isValid) {
					const reason = !sku
						? "SKU not found"
						: `invalid (active=${sku.isActive}, stock=${sku.inventory}, deleted=${!!sku.deletedAt})`;
					logger.error(
						`[WEBHOOK] Validation failed for order ${orderId}, SKU ${item.skuId}: ${reason}`,
						undefined,
						{ service: "webhook" },
					);
					throw new Error(
						`Invalid item in order: ${reason} (SKU: ${item.skuId}, Quantity: ${item.quantity})`,
					);
				}
			}

			logger.info(`[WEBHOOK] All items validated successfully for order ${orderId}`, {
				service: "webhook",
			});

			// 4. Decrement stock for each item
			for (const item of order.items) {
				await tx.productSku.update({
					where: { id: item.skuId },
					data: { inventory: { decrement: item.quantity } },
				});
			}

			logger.info(`✅ [WEBHOOK] Stock decremented for order ${orderId}`, { service: "webhook" });

			// 5. Update order with shipping info
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
					shippingMethod: getShippingMethodFromRate(shippingRateId ?? ""),
					shippingCarrier: getShippingCarrierFromRate(shippingRateId ?? ""),
				},
			});

			// 5b. Deactivate out-of-stock SKUs (single query instead of N+1)
			const { count: deactivatedCount } = await tx.productSku.updateMany({
				where: { id: { in: skuIds }, inventory: 0 },
				data: { isActive: false },
			});
			if (deactivatedCount > 0) {
				logger.info(
					`📦 [WEBHOOK] ${deactivatedCount} SKU(s) deactivated (out of stock) for order ${orderId}`,
					{ service: "webhook" },
				);
			}

			// 6. Clear cart after successful payment (logged-in OR guest)
			if (order.userId) {
				await tx.cartItem.deleteMany({
					where: { cart: { userId: order.userId } },
				});
				logger.info(`🧹 [WEBHOOK] Cart cleared for user ${order.userId} after successful payment`, {
					service: "webhook",
				});
			} else {
				// Guest: get sessionId from Stripe metadata
				const guestSessionId = session.metadata?.guestSessionId;
				if (guestSessionId) {
					await tx.cartItem.deleteMany({
						where: { cart: { sessionId: guestSessionId } },
					});
					logger.info(
						`🧹 [WEBHOOK] Cart cleared for guest session ${guestSessionId} after successful payment`,
						{ service: "webhook" },
					);
				}
			}

			logger.info("✅ [WEBHOOK] Order processed successfully:" + " " + order.orderNumber, {
				service: "webhook",
			});

			return mapToOrderWithItems(order);
		},
		{ timeout: 10000 },
	);
}

/**
 * Processes order from a Payment Intent (new PI flow).
 * Similar to processOrderTransaction but uses PI metadata instead of Checkout Session.
 * Shipping info is already stored in the Order (set during confirmCheckout).
 */
export async function processOrderFromPaymentIntent(
	orderId: string,
	paymentIntent: Stripe.PaymentIntent,
): Promise<OrderWithItems> {
	return prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			// 1. Fetch order with items and SKUs
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

			// 2. Idempotence check
			if (order.paymentStatus === "PAID") {
				logger.info(`⚠️  [WEBHOOK] Order ${orderId} already processed (PI flow), skipping`, {
					service: "webhook",
				});
				return mapToOrderWithItems(order);
			}

			// 3. Re-validate all items INSIDE the transaction
			logger.info(
				`[WEBHOOK] Re-validating ${order.items.length} items for order ${orderId} (PI flow)`,
				{ service: "webhook" },
			);

			const skuIds = order.items.map((item) => item.skuId);
			const skus = await tx.$queryRaw<
				Array<{
					id: string;
					inventory: number;
					isActive: boolean;
					deletedAt: Date | null;
					productStatus: string;
					productDeletedAt: Date | null;
				}>
			>`
				SELECT ps.id, ps.inventory, ps."isActive", ps."deletedAt",
				       p.status as "productStatus", p."deletedAt" as "productDeletedAt"
				FROM "ProductSku" ps
				INNER JOIN "Product" p ON ps."productId" = p.id
				WHERE ps.id = ANY(${skuIds}::text[])
				FOR UPDATE
			`;
			const skuMap = new Map(skus.map((s) => [s.id, s]));

			for (const item of order.items) {
				const sku = skuMap.get(item.skuId);
				const isValid =
					sku &&
					!sku.deletedAt &&
					!sku.productDeletedAt &&
					sku.isActive &&
					sku.productStatus === "PUBLIC" &&
					sku.inventory >= item.quantity;

				if (!isValid) {
					const reason = !sku
						? "SKU not found"
						: `invalid (active=${sku.isActive}, stock=${sku.inventory}, deleted=${!!sku.deletedAt})`;
					logger.error(
						`[WEBHOOK] Validation failed for order ${orderId}, SKU ${item.skuId}: ${reason}`,
						undefined,
						{ service: "webhook" },
					);
					throw new Error(
						`Invalid item in order: ${reason} (SKU: ${item.skuId}, Quantity: ${item.quantity})`,
					);
				}
			}

			logger.info(`[WEBHOOK] All items validated successfully for order ${orderId} (PI flow)`, {
				service: "webhook",
			});

			// 4. Decrement stock for each item
			for (const item of order.items) {
				await tx.productSku.update({
					where: { id: item.skuId },
					data: { inventory: { decrement: item.quantity } },
				});
			}

			logger.info(`✅ [WEBHOOK] Stock decremented for order ${orderId} (PI flow)`, {
				service: "webhook",
			});

			// 5. Update order status — shipping info already in Order from confirmCheckout
			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "PROCESSING",
					paymentStatus: "PAID",
					paidAt: new Date(),
					stripePaymentIntentId: paymentIntent.id,
					stripeCustomerId:
						typeof paymentIntent.customer === "string" ? paymentIntent.customer : null,
				},
			});

			// 5b. Deactivate out-of-stock SKUs
			const { count: deactivatedCount } = await tx.productSku.updateMany({
				where: { id: { in: skuIds }, inventory: 0 },
				data: { isActive: false },
			});
			if (deactivatedCount > 0) {
				logger.info(
					`📦 [WEBHOOK] ${deactivatedCount} SKU(s) deactivated (out of stock) for order ${orderId} (PI flow)`,
					{ service: "webhook" },
				);
			}

			// 6. Clear cart — use guestSessionId from PI metadata for guests
			if (order.userId) {
				await tx.cartItem.deleteMany({
					where: { cart: { userId: order.userId } },
				});
				logger.info(
					`🧹 [WEBHOOK] Cart cleared for user ${order.userId} after successful payment (PI flow)`,
					{ service: "webhook" },
				);
			} else {
				const guestSessionId = paymentIntent.metadata.guestSessionId;
				if (guestSessionId) {
					await tx.cartItem.deleteMany({
						where: { cart: { sessionId: guestSessionId } },
					});
					logger.info(
						`🧹 [WEBHOOK] Cart cleared for guest session ${guestSessionId} after successful payment (PI flow)`,
						{ service: "webhook" },
					);
				}
			}

			logger.info(`✅ [WEBHOOK] Order processed successfully (PI flow): ${order.orderNumber}`, {
				service: "webhook",
			});

			return mapToOrderWithItems(order);
		},
		{ timeout: 10000 },
	);
}

/**
 * Builds post-checkout tasks for a successful Checkout Session order.
 */
export function buildPostCheckoutTasks(
	order: OrderWithItems,
	session: Stripe.Checkout.Session,
): PostWebhookTask[] {
	const tasks: PostWebhookTask[] = [];
	const baseUrl = getBaseUrl();

	// 1. Cache invalidation (cart, user orders, account stats, dashboard)
	const cacheTags: string[] = [...getOrderInvalidationTags(order.userId ?? undefined, order.id)];

	if (order.userId) {
		cacheTags.push(...getCartInvalidationTags(order.userId, undefined));
	} else {
		const guestSessionId = session.metadata?.guestSessionId;
		if (guestSessionId) {
			cacheTags.push(...getCartInvalidationTags(undefined, guestSessionId));
		}
	}

	// Real-time stock of purchased SKUs
	for (const item of order.items) {
		if (item.sku?.id) {
			cacheTags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(item.sku.id));
		}
	}

	if (cacheTags.length > 0) {
		tasks.push({ type: "INVALIDATE_CACHE", tags: cacheTags });
	}

	// 2. Customer confirmation email
	const customerEmail = session.customer_email ?? session.customer_details?.email;
	if (customerEmail) {
		const trackingUrl = `${baseUrl}/orders`;

		tasks.push({
			type: "ORDER_CONFIRMATION_EMAIL",
			data: {
				to: customerEmail,
				orderNumber: order.orderNumber,
				customerName:
					`${order.shippingFirstName ?? ""} ${order.shippingLastName ?? ""}`.trim() || "Client",
				items: order.items.map((item) => ({
					productTitle: item.productTitle ?? "Produit",
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
					firstName: order.shippingFirstName ?? "",
					lastName: order.shippingLastName ?? "",
					address1: order.shippingAddress1 ?? "",
					address2: order.shippingAddress2,
					postalCode: order.shippingPostalCode ?? "",
					city: order.shippingCity ?? "",
					country: order.shippingCountry ?? "",
				},
				trackingUrl,
			},
		});
	}

	// 3. Admin notification
	const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`;

	tasks.push({
		type: "ADMIN_NEW_ORDER_EMAIL",
		data: {
			orderNumber: order.orderNumber,
			customerName:
				`${order.shippingFirstName ?? ""} ${order.shippingLastName ?? ""}`.trim() || "Client",
			customerEmail: customerEmail ?? "Email non disponible",
			items: order.items.map((item) => ({
				productTitle: item.productTitle ?? "Produit",
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
				firstName: order.shippingFirstName ?? "",
				lastName: order.shippingLastName ?? "",
				address1: order.shippingAddress1 ?? "",
				address2: order.shippingAddress2,
				postalCode: order.shippingPostalCode ?? "",
				city: order.shippingCity ?? "",
				country: order.shippingCountry ?? "",
				phone: order.shippingPhone ?? "",
			},
			dashboardUrl,
		},
	});

	return tasks;
}

/**
 * Builds post-checkout tasks for a successful Payment Intent order (new flow).
 * Gets customerEmail from the Order itself (not from Stripe session).
 */
export function buildPostCheckoutTasksFromPI(
	order: OrderWithItems,
	paymentIntent: Stripe.PaymentIntent,
): PostWebhookTask[] {
	const tasks: PostWebhookTask[] = [];
	const baseUrl = getBaseUrl();

	// 1. Cache invalidation
	const cacheTags: string[] = [...getOrderInvalidationTags(order.userId ?? undefined, order.id)];

	if (order.userId) {
		cacheTags.push(...getCartInvalidationTags(order.userId, undefined));
	} else {
		const guestSessionId = paymentIntent.metadata.guestSessionId;
		if (guestSessionId) {
			cacheTags.push(...getCartInvalidationTags(undefined, guestSessionId));
		}
	}

	for (const item of order.items) {
		if (item.sku?.id) {
			cacheTags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(item.sku.id));
		}
	}

	if (cacheTags.length > 0) {
		tasks.push({ type: "INVALIDATE_CACHE", tags: cacheTags });
	}

	// 2. Customer confirmation email — get email from Order (already stored during confirmCheckout)
	const customerEmail = paymentIntent.receipt_email;
	// Fallback: query order email from DB (already in the order via createOrderInTransaction)
	const orderCustomerName =
		`${order.shippingFirstName ?? ""} ${order.shippingLastName ?? ""}`.trim() || "Client";

	if (customerEmail) {
		const trackingUrl = `${baseUrl}/orders`;

		tasks.push({
			type: "ORDER_CONFIRMATION_EMAIL",
			data: {
				to: customerEmail,
				orderNumber: order.orderNumber,
				customerName: orderCustomerName,
				items: order.items.map((item) => ({
					productTitle: item.productTitle ?? "Produit",
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
					firstName: order.shippingFirstName ?? "",
					lastName: order.shippingLastName ?? "",
					address1: order.shippingAddress1 ?? "",
					address2: order.shippingAddress2,
					postalCode: order.shippingPostalCode ?? "",
					city: order.shippingCity ?? "",
					country: order.shippingCountry ?? "",
				},
				trackingUrl,
			},
		});
	}

	// 3. Admin notification
	const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`;

	tasks.push({
		type: "ADMIN_NEW_ORDER_EMAIL",
		data: {
			orderNumber: order.orderNumber,
			customerName: orderCustomerName,
			customerEmail: customerEmail ?? "Email non disponible",
			items: order.items.map((item) => ({
				productTitle: item.productTitle ?? "Produit",
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
				firstName: order.shippingFirstName ?? "",
				lastName: order.shippingLastName ?? "",
				address1: order.shippingAddress1 ?? "",
				address2: order.shippingAddress2,
				postalCode: order.shippingPostalCode ?? "",
				city: order.shippingCity ?? "",
				country: order.shippingCountry ?? "",
				phone: order.shippingPhone ?? "",
			},
			dashboardUrl,
		},
	});

	return tasks;
}

/**
 * Marks an order as expired/cancelled.
 */
export async function cancelExpiredOrder(
	orderId: string,
): Promise<{ cancelled: boolean; orderNumber?: string }> {
	const result = await prisma.$transaction(
		async (tx) => {
			const order = await tx.order.findUnique({
				where: { id: orderId },
				select: { paymentStatus: true, orderNumber: true },
			});

			if (!order) {
				logger.warn(`⚠️  [WEBHOOK] Order not found for expired session: ${orderId}`, {
					service: "webhook",
				});
				return { cancelled: false } as const;
			}

			// Idempotence: only process if the order is still PENDING
			if (order.paymentStatus !== "PENDING") {
				logger.info(
					`ℹ️  [WEBHOOK] Order ${orderId} already processed (status: ${order.paymentStatus}), skipping expiration`,
					{ service: "webhook" },
				);
				return { cancelled: false, orderNumber: order.orderNumber } as const;
			}

			// Release discount usages
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
				logger.info(
					`🔓 [WEBHOOK] Released ${discountUsages.length} discount usage(s) for expired order ${orderId}`,
					{ service: "webhook" },
				);
			}

			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "CANCELLED",
					paymentStatus: "EXPIRED",
				},
			});

			logger.info(
				`✅ [WEBHOOK] Order ${orderId} (${order.orderNumber}) marked as cancelled due to session expiration`,
				{ service: "webhook" },
			);
			return { cancelled: true, orderNumber: order.orderNumber } as const;
		},
		{ timeout: 10000 },
	);

	return result;
}
