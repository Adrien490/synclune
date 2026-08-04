import type Stripe from "stripe";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { generateInvoiceAccessToken } from "@/modules/orders/utils/invoice-token";
import { buildOrderTrackingUrl } from "@/modules/orders/utils/build-order-tracking-url";
import { collectStockInvalidationTags } from "@/modules/products/utils/cache.utils";
import type { PostWebhookTask } from "../types/webhook.types";
import type { OrderWithItems } from "../types/checkout.types";
import { getBaseUrl } from "@/shared/constants/urls";

function buildInvoiceUrl(baseUrl: string, orderId: string, orderNumber: string): string {
	const token = generateInvoiceAccessToken(orderId, orderNumber);
	return `${baseUrl}/api/orders/${encodeURIComponent(orderNumber)}/invoice?token=${token}`;
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
	//
	// ⚠️ Plus AUCUN tag panier : depuis le passage du panier en cookie
	// (2026-08-04), le panier n'a plus d'entrée de cache par identité à invalider.
	// Sa seule dépendance serveur est la matérialisation des SKUs (`fetchCartSkus`),
	// couverte par les tags catalogue posés juste en dessous.
	const cacheTags: string[] = [...getOrderInvalidationTags(order.id)];

	// CACHE-CATALOG-002 : le décrément de stock doit invalider la page produit
	// (tag `product-${slug}`, qui embarque skus.inventory) et l'inventaire admin,
	// pas seulement SKU_STOCK — sinon vitrine périmée jusqu'à expiration `catalog`.
	cacheTags.push(
		...collectStockInvalidationTags(
			order.items
				.filter((item) => item.sku?.id)
				.map((item) => ({
					skuId: item.sku!.id,
					productId: item.sku!.product.id,
					productSlug: item.sku!.product.slug,
				})),
		),
	);

	if (cacheTags.length > 0) {
		tasks.push({ type: "INVALIDATE_CACHE", tags: cacheTags });
	}

	// 2. Customer confirmation email — fallback to Order.customerEmail if receipt_email is null
	const customerEmail = paymentIntent.receipt_email ?? order.customerEmail;
	const orderCustomerName =
		`${order.shippingFirstName ?? ""} ${order.shippingLastName ?? ""}`.trim() || "Client";

	if (customerEmail) {
		// AUDIT-BIZ-001 : ce lien pointait vers un segment « orders » inexistant
		// (l'espace client est ROUTES.ACCOUNT, soit « commandes ») — le CTA principal
		// de l'email de confirmation était donc mort sur 100 % des commandes
		// encaissées par Stripe, alors que les deux autres émetteurs du même email
		// (mark-as-paid, resend-order-email) construisaient la bonne URL. SSOT unique
		// désormais : `buildOrderTrackingUrl`, qui route aussi les invités
		// (userId null) vers la page de suivi tokenisée au lieu du mur de connexion.
		// Le garde-fou est `order-tracking-url.regression.test.ts` (il vérifie le
		// segment contre les routes réellement servies, pas contre une constante).
		const trackingUrl = buildOrderTrackingUrl(order);

		tasks.push({
			type: "ORDER_CONFIRMATION_EMAIL",
			data: {
				to: customerEmail,
				orderNumber: order.orderNumber,
				customerName: orderCustomerName,
				items: order.items.map((item) => ({
					productTitle: item.productTitle ?? "Produit",
					skuColor: item.skuColor,
					skuColorHexes: item.skuColorHexes,
					skuMaterial: item.skuMaterial,
					skuSize: item.skuSize,
					quantity: item.quantity,
					price: item.price,
				})),
				subtotal: order.subtotal,
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

	return tasks;
}
