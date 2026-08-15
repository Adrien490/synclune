import { ShippingConfirmationEmail } from "@/emails/shipping-confirmation-email";
import { detectCarrierAndUrl } from "@/modules/orders/services/carrier-detection.service";
import {
	estimateDeliveryDate,
	isCountrySupported,
} from "@/modules/orders/services/shipping.service";
import { buildOrderTrackingUrl } from "@/modules/orders/lib/order-tracking-url";
import { EMAIL_SUBJECTS } from "@/shared/lib/email-config";
import { formatDateLong } from "@/shared/utils/dates";
import type { EmailResult } from "../types/email.types";
import { renderAndSend } from "./send-email";

export interface OrderForShippingEmail {
	id: string;
	invoiceNumber: number | null;
	email: string;
	customerName: string | null;
	trackingNumber: string;
	shippedAt: Date;
	shippingLine1: string | null;
	shippingLine2: string | null;
	shippingZip: string | null;
	shippingCity: string | null;
	shippingCountry: string | null;
}

/**
 * Émetteur UNIQUE de l'email d'expédition (action admin « Marquer expédiée »).
 * Idempotence : `order-shipped:<orderId>` (Resend, 24 h) — un double clic
 * n'envoie qu'un email, la garde de transition n'en laissant de toute façon
 * passer qu'un seul.
 */
export async function sendShippingConfirmationEmail(
	order: OrderForShippingEmail,
): Promise<EmailResult> {
	const detection = detectCarrierAndUrl(order.trackingNumber);
	const estimatedDelivery =
		order.shippingCountry && isCountrySupported(order.shippingCountry)
			? formatDateLong(estimateDeliveryDate(order.shippedAt, order.shippingCountry))
			: null;

	return renderAndSend(
		<ShippingConfirmationEmail
			orderNumber={order.invoiceNumber != null ? `n° ${order.invoiceNumber}` : order.id}
			customerName={order.customerName ?? "cliente"}
			trackingNumber={order.trackingNumber}
			trackingUrl={detection.url}
			orderTrackingUrl={buildOrderTrackingUrl(order)}
			carrierLabel={detection.label}
			estimatedDelivery={estimatedDelivery}
			shippingAddress={{
				name: order.customerName,
				line1: order.shippingLine1,
				line2: order.shippingLine2,
				postalCode: order.shippingZip,
				city: order.shippingCity,
				country: order.shippingCountry,
			}}
		/>,
		{
			to: order.email,
			subject: EMAIL_SUBJECTS.ORDER_SHIPPED,
			idempotencyKey: `order-shipped:${order.id}`,
			tags: [{ name: "category", value: "order" }],
		},
	);
}
