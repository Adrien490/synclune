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
		}),
		{
			to: params.to,
			subject: EMAIL_SUBJECTS.REFUND_CONFIRMATION,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "payment" }],
		},
	);
}
