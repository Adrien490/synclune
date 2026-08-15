import { RetractationAckEmail } from "@/emails/retractation-ack-email";
import { RetractationRefundedEmail } from "@/emails/retractation-refunded-email";
import { RetractationRejectedEmail } from "@/emails/retractation-rejected-email";
import { buildOrderTrackingUrl } from "@/modules/orders/lib/order-tracking-url";
import { signOrderTrackingToken } from "@/modules/orders/lib/order-tracking-token";
import { SITE_URL } from "@/shared/constants/seo-config";
import { EMAIL_SUBJECTS } from "@/shared/lib/email-config";
import type { EmailResult } from "../types/email.types";
import { renderAndSend } from "./send-email";

interface OrderIdentity {
	id: string;
	invoiceNumber: number | null;
	email: string;
	customerName: string | null;
}

function orderNumberLabel(order: OrderIdentity): string {
	return order.invoiceNumber != null ? `n° ${order.invoiceNumber}` : order.id;
}

/** Lien tokenisé vers l'avoir HTML — même clé HMAC que le suivi. */
function buildCreditNoteUrl(order: { id: string; email: string }): string | null {
	const secret = process.env.AUTH_SECRET;
	if (!secret || !order.email) return null;
	const token = signOrderTrackingToken(order.id, order.email, secret);
	return `${SITE_URL}/suivi-commande/avoir?commande=${order.id}&token=${token}`;
}

/**
 * Accusé de réception — envoyé SANS DÉLAI après la création de la demande
 * (obligation de la rétractation en ligne). Idempotence Resend
 * `retractation-ack:<orderId>` (une seule demande possible par commande).
 */
export async function sendRetractationAckEmail(params: {
	order: OrderIdentity;
	reason: string | null;
}): Promise<EmailResult> {
	const { order } = params;
	return renderAndSend(
		<RetractationAckEmail
			orderNumber={orderNumberLabel(order)}
			customerName={order.customerName ?? "cliente"}
			reason={params.reason}
			orderTrackingUrl={buildOrderTrackingUrl(order)}
		/>,
		{
			to: order.email,
			subject: EMAIL_SUBJECTS.RETRACTATION_ACK,
			idempotencyKey: `retractation-ack:${order.id}`,
			tags: [{ name: "category", value: "retractation" }],
		},
	);
}

export async function sendRetractationRefundedEmail(params: {
	order: OrderIdentity;
	amountRefundedCents: number;
	creditNoteNumber: number;
}): Promise<EmailResult> {
	const { order } = params;
	return renderAndSend(
		<RetractationRefundedEmail
			orderNumber={orderNumberLabel(order)}
			customerName={order.customerName ?? "cliente"}
			amountRefundedCents={params.amountRefundedCents}
			creditNoteNumber={params.creditNoteNumber}
			creditNoteUrl={buildCreditNoteUrl(order)}
		/>,
		{
			to: order.email,
			subject: EMAIL_SUBJECTS.RETRACTATION_REFUNDED,
			idempotencyKey: `retractation-refund:${order.id}`,
			tags: [{ name: "category", value: "retractation" }],
		},
	);
}

export async function sendRetractationRejectedEmail(params: {
	order: OrderIdentity;
	rejectionReason: string;
}): Promise<EmailResult> {
	const { order } = params;
	return renderAndSend(
		<RetractationRejectedEmail
			orderNumber={orderNumberLabel(order)}
			customerName={order.customerName ?? "cliente"}
			rejectionReason={params.rejectionReason}
		/>,
		{
			to: order.email,
			subject: EMAIL_SUBJECTS.RETRACTATION_REJECTED,
			idempotencyKey: `retractation-reject:${order.id}`,
			tags: [{ name: "category", value: "retractation" }],
		},
	);
}
