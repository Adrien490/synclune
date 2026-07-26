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
	skipIdempotence,
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
	/**
	 * IDEM-EMAIL-001 : court-circuite le cache de dédup in-process (10 min).
	 * Réservé au renvoi explicite depuis l'admin — cf. `resendOrderEmail`.
	 */
	skipIdempotence?: boolean;
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
			...(skipIdempotence && { skipIdempotence }),
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
	orderTrackingUrl,
	carrierLabel,
	estimatedDelivery,
	shippingAddress,
	idempotencyKey,
	skipIdempotence,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	/** Repli quand le transporteur n'a pas d'URL de suivi — cf. `buildOrderTrackingUrl`. */
	orderTrackingUrl?: string | null;
	carrierLabel: string;
	/** Date de livraison estimée pré-formatée (ex: "12 juin 2026"). */
	estimatedDelivery?: string | null;
	shippingAddress: ShippingAddress;
	/** EMAIL-AUDIT-003 : dedup Resend 24h. Convention `order-shipped:${orderId}`. */
	idempotencyKey?: string;
	/**
	 * IDEM-EMAIL-001 : court-circuite le cache de dédup in-process (10 min).
	 * Réservé au renvoi explicite depuis l'admin — cf. `resendOrderEmail`.
	 */
	skipIdempotence?: boolean;
}): Promise<EmailResult> {
	return renderAndSend(
		ShippingConfirmationEmail({
			orderNumber,
			customerName,
			trackingNumber,
			trackingUrl,
			orderTrackingUrl,
			carrierLabel,
			estimatedDelivery,
			shippingAddress,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_SHIPPED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
			...(idempotencyKey && { idempotencyKey }),
			...(skipIdempotence && { skipIdempotence }),
		},
	);
}
