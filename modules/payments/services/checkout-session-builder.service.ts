import type Stripe from "stripe";
import { stripe, getInvoiceFooter, withStripeCircuitBreaker } from "@/shared/lib/stripe";
import { getShippingOptionsForAddress } from "@/modules/orders/constants/stripe-shipping-rates";
import type { ShippingCountry } from "@/shared/constants/countries";

interface BuildCheckoutSessionParams {
	lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
	stripeCustomerId: string | null;
	finalEmail: string | null;
	stripeCouponId?: string;
	orderId: string;
	orderNumber: string;
	userId: string | null;
	sessionId: string | null;
	shippingCountry: ShippingCountry;
	shippingPostalCode: string;
}

/**
 * Creates a Stripe embedded checkout session with idempotency protection.
 *
 * Includes invoice generation, shipping options, and a 30-minute expiration
 * for limited-stock jewelry products.
 */
export async function createStripeCheckoutSession(
	params: BuildCheckoutSessionParams,
): Promise<Stripe.Checkout.Session> {
	const idempotencyKey = `checkout-${params.orderId}`;
	const baseUrl = process.env.BETTER_AUTH_URL;

	return withStripeCircuitBreaker(() =>
		stripe.checkout.sessions.create(
			{
				mode: "payment",
				ui_mode: "embedded",
				line_items: params.lineItems,

				...(params.stripeCouponId && {
					discounts: [{ coupon: params.stripeCouponId }],
				}),

				customer: params.stripeCustomerId || undefined,
				customer_email: !params.stripeCustomerId ? params.finalEmail || undefined : undefined,

				shipping_options: getShippingOptionsForAddress(
					params.shippingCountry,
					params.shippingPostalCode,
				),

				customer_update: {
					shipping: "auto",
				},

				client_reference_id: params.orderId,
				metadata: {
					orderId: params.orderId,
					orderNumber: params.orderNumber,
					userId: params.userId || "guest",
					...(params.sessionId && { guestSessionId: params.sessionId }),
				},

				expires_at: Math.floor(Date.now() / 1000) + 30 * 60,

				return_url: `${baseUrl}/paiement/retour?session_id={CHECKOUT_SESSION_ID}&order_id=${params.orderId}`,

				locale: "fr",
				invoice_creation: {
					enabled: true,
					invoice_data: {
						metadata: {
							orderNumber: params.orderNumber,
							orderId: params.orderId,
						},
						description: `Commande ${params.orderNumber}`,
						footer: getInvoiceFooter(),
					},
				},
			},
			{ idempotencyKey },
		),
	);
}
