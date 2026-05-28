import type Stripe from "stripe";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { generateInvoiceAccessToken } from "@/modules/orders/utils/invoice-token";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import type { PostWebhookTask } from "../types/webhook.types";
import type { OrderWithItems } from "../types/checkout.types";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";

function buildInvoiceUrl(baseUrl: string, orderId: string, orderNumber: string): string {
	const token = generateInvoiceAccessToken(orderId, orderNumber);
	return `${baseUrl}/api/orders/${encodeURIComponent(orderNumber)}/invoice?token=${token}`;
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
		const invoiceUrl = buildInvoiceUrl(baseUrl, order.id, order.orderNumber);

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
				invoiceUrl,
				// ORD-STRIPE-008 : dedup cross-instance Resend 24h sur retries.
				idempotencyKey: `order-confirm-${order.id}`,
			},
		});
	}

	// 3. Admin notification
	const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`;

	tasks.push({
		type: "ADMIN_NEW_ORDER_EMAIL",
		data: {
			orderId: order.id,
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
	const invoiceUrl = buildInvoiceUrl(baseUrl, order.id, order.orderNumber);

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

	// 2. Customer confirmation email — fallback to Order.customerEmail if receipt_email is null
	const customerEmail = paymentIntent.receipt_email ?? order.customerEmail;
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
				invoiceUrl,
				// ORD-STRIPE-008 : dedup cross-instance Resend 24h sur retries.
				idempotencyKey: `order-confirm-${order.id}`,
			},
		});
	}

	// 3. Admin notification
	const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`;

	tasks.push({
		type: "ADMIN_NEW_ORDER_EMAIL",
		data: {
			orderId: order.id,
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
