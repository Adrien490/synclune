import { OrderConfirmationEmail } from "@/emails/order-confirmation-email";
import { buildOrderTrackingUrl } from "@/modules/orders/lib/order-tracking-url";
import { EMAIL_SUBJECTS } from "@/shared/lib/email-config";
import type { EmailResult } from "../types/email.types";
import { renderAndSend } from "./send-email";

/**
 * Décalque structurel d'un Order lean + ses lignes, tel que le webhook (ou la
 * réconciliation admin) le relit après la transition PENDING→PAID.
 */
export interface OrderForConfirmationEmail {
	id: string;
	/** Attribué dans la même transaction que la transition PAID (lot 4). */
	invoiceNumber: number | null;
	email: string;
	customerName: string | null;
	amountItemsCents: number;
	amountShippingCents: number;
	amountTotalCents: number;
	shippingLine1: string | null;
	shippingLine2: string | null;
	shippingZip: string | null;
	shippingCity: string | null;
	shippingCountry: string | null;
	items: Array<{
		nameSnapshot: string;
		variantSnapshot: string | null;
		unitPriceCents: number;
		quantity: number;
	}>;
}

/**
 * Émetteur UNIQUE de l'email de confirmation de commande.
 *
 * Appelé après une transition PENDING→PAID réussie (webhook
 * `checkout.session.completed` ou réconciliation admin). L'idempotence est
 * portée par l'`idempotencyKey` Resend `order-confirm:<orderId>` (dédup 24 h
 * côté Resend, cross-instance) — la garde de transition `updateMany` garantit
 * déjà qu'un seul chemin y arrive par commande.
 */
export async function sendOrderConfirmationEmail(
	order: OrderForConfirmationEmail,
): Promise<EmailResult> {
	return renderAndSend(
		<OrderConfirmationEmail
			orderNumber={order.invoiceNumber != null ? `n° ${order.invoiceNumber}` : order.id}
			customerName={order.customerName ?? "cliente"}
			items={order.items.map((item) => ({
				name: item.nameSnapshot,
				variantLabel: item.variantSnapshot,
				quantity: item.quantity,
				unitPriceCents: item.unitPriceCents,
			}))}
			subtotal={order.amountItemsCents}
			shipping={order.amountShippingCents}
			total={order.amountTotalCents}
			shippingAddress={{
				name: order.customerName,
				line1: order.shippingLine1,
				line2: order.shippingLine2,
				postalCode: order.shippingZip,
				city: order.shippingCity,
				country: order.shippingCountry,
			}}
			trackingUrl={buildOrderTrackingUrl(order)}
		/>,
		{
			to: order.email,
			subject: EMAIL_SUBJECTS.ORDER_CONFIRMATION,
			idempotencyKey: `order-confirm:${order.id}`,
			tags: [{ name: "category", value: "order" }],
		},
	);
}
