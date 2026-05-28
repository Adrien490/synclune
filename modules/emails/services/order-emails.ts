import { OrderConfirmationEmail } from "@/emails/order-confirmation-email";
import { ShippingConfirmationEmail } from "@/emails/shipping-confirmation-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult, ShippingAddress, OrderItem } from "../types/email.types";

/**
 * Envoie un email de confirmation de commande au client
 */
export async function sendOrderConfirmationEmail({
	to,
	orderNumber,
	customerName,
	items,
	subtotal,
	discount,
	shipping,
	total,
	shippingAddress,
	trackingUrl,
	invoiceUrl,
	idempotencyKey,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	items: OrderItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	total: number;
	shippingAddress: ShippingAddress;
	trackingUrl: string;
	/**
	 * Lien direct vers le PDF facture (mise à disposition Art. 289-I CGI).
	 * Inclut un token signé HMAC pour les commandes guest sans session.
	 */
	invoiceUrl?: string | null;
	/**
	 * ORD-STRIPE-008 : clé Resend Idempotency-Key (24h cross-instance).
	 * Évite double-envoi en cas de retry webhook (cron retry-webhooks).
	 */
	idempotencyKey?: string;
}): Promise<EmailResult> {
	return renderAndSend(
		OrderConfirmationEmail({
			orderNumber,
			customerName,
			items,
			subtotal,
			discount,
			shipping,
			total,
			shippingAddress,
			trackingUrl,
			invoiceUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_CONFIRMATION,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
			...(idempotencyKey && { idempotencyKey }),
		},
	);
}

/**
 * Envoie un email de confirmation d'expedition au client
 */
export async function sendShippingConfirmationEmail({
	to,
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	shippingAddress,
	idempotencyKey,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	carrierLabel: string;
	shippingAddress: ShippingAddress;
	/** EMAIL-AUDIT-003 : dedup Resend 24h. Convention `order-shipped:${orderId}`. */
	idempotencyKey?: string;
}): Promise<EmailResult> {
	return renderAndSend(
		ShippingConfirmationEmail({
			orderNumber,
			customerName,
			trackingNumber,
			trackingUrl,
			carrierLabel,
			shippingAddress,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_SHIPPED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
			...(idempotencyKey && { idempotencyKey }),
		},
	);
}
