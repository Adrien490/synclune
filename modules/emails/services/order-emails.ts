import { OrderConfirmationEmail } from "@/emails/order-confirmation-email";
import { ShippingConfirmationEmail } from "@/emails/shipping-confirmation-email";
import { TrackingUpdateEmail } from "@/emails/tracking-update-email";
import { DeliveryConfirmationEmail } from "@/emails/delivery-confirmation-email";
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

/**
 * Envoie un email de mise a jour du suivi de commande au client
 */
export async function sendTrackingUpdateEmail({
	to,
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	idempotencyKey,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	carrierLabel: string;
	/**
	 * EMAIL-AUDIT-003 : dedup Resend 24h. La clé inclut `trackingNumber` car un
	 * même numéro updaté plusieurs fois = même info, mais un nouveau tracking
	 * mérite un nouveau mail.
	 */
	idempotencyKey?: string;
}): Promise<EmailResult> {
	return renderAndSend(
		TrackingUpdateEmail({
			orderNumber,
			customerName,
			trackingNumber,
			trackingUrl,
			carrierLabel,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_TRACKING_UPDATE,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
			...(idempotencyKey && { idempotencyKey }),
		},
	);
}

/**
 * Envoie un email de confirmation de livraison au client
 */
export async function sendDeliveryConfirmationEmail({
	to,
	orderNumber,
	customerName,
	deliveryDate,
	orderDetailsUrl,
	idempotencyKey,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	deliveryDate: string;
	orderDetailsUrl: string;
	/** EMAIL-AUDIT-003 : dedup Resend 24h. Convention `order-delivered:${orderId}`. */
	idempotencyKey?: string;
}): Promise<EmailResult> {
	return renderAndSend(
		DeliveryConfirmationEmail({
			orderNumber,
			customerName,
			deliveryDate,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_DELIVERED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
			...(idempotencyKey && { idempotencyKey }),
		},
	);
}
