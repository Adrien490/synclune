import { RefundConfirmedEmail } from "@/emails/refund-confirmed-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

type RefundConfirmationEmailParams = {
	to: string;
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	reason: string;
	orderDetailsUrl: string;
	/**
	 * Numéro d'avoir comptable (`A-YYYY-NNNNN`, Art. 272-I CGI). Optionnel —
	 * uniquement présent quand `voidInvoice()` a émis un avoir suite au
	 * remboursement total.
	 */
	creditNoteNumber?: string | null;
	/** Numéro de la facture annulée par l'avoir (`F-YYYY-NNNNN`). */
	invoiceNumber?: string | null;
	/**
	 * ORD-STRIPE-008 : clé Resend Idempotency-Key (24h cross-instance).
	 * Évite l'envoi double si le webhook est rejoué (Stripe retry, cron
	 * retry-webhooks) ou si admin path et webhook path tombent quand même
	 * tous deux dans cette fonction (filet de sécurité après ORD-STRIPE-001).
	 */
	idempotencyKey?: string;
};

/**
 * Envoie un email de confirmation de remboursement au client (remboursement exécuté par Stripe).
 * Remboursement total uniquement — les statuts approved/cancelled/rejected sont silencieux côté client
 * depuis l'audit 2026 (admin-only workflow).
 */
export async function sendRefundConfirmationEmail(
	params: RefundConfirmationEmailParams,
): Promise<EmailResult> {
	return renderAndSend(
		RefundConfirmedEmail({
			orderNumber: params.orderNumber,
			customerName: params.customerName,
			refundAmount: params.refundAmount,
			reason: params.reason,
			orderDetailsUrl: params.orderDetailsUrl,
			creditNoteNumber: params.creditNoteNumber,
			invoiceNumber: params.invoiceNumber,
		}),
		{
			to: params.to,
			subject: EMAIL_SUBJECTS.REFUND_CONFIRMATION,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "payment" }],
			...(params.idempotencyKey && { idempotencyKey: params.idempotencyKey }),
		},
	);
}
