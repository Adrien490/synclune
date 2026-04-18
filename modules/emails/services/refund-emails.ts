import { RefundStatusEmail } from "@/emails/refund-status-email";
import { RefundRejectedEmail } from "@/emails/refund-rejected-email";
import { RefundCancelledEmail } from "@/emails/refund-cancelled-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

type RefundEmailParams = {
	to: string;
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	originalOrderTotal: number;
	reason: string;
	isPartialRefund: boolean;
	orderDetailsUrl: string;
};

/**
 * Envoie un email de confirmation de remboursement au client (remboursement exécuté).
 */
export async function sendRefundConfirmationEmail(params: RefundEmailParams): Promise<EmailResult> {
	return renderAndSend(
		RefundStatusEmail({
			status: "confirmed",
			orderNumber: params.orderNumber,
			customerName: params.customerName,
			refundAmount: params.refundAmount,
			originalOrderTotal: params.originalOrderTotal,
			reason: params.reason,
			isPartialRefund: params.isPartialRefund,
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

/**
 * Envoie un email au client lorsque sa demande de remboursement est approuvée.
 */
export async function sendRefundApprovedEmail(params: RefundEmailParams): Promise<EmailResult> {
	return renderAndSend(
		RefundStatusEmail({
			status: "approved",
			orderNumber: params.orderNumber,
			customerName: params.customerName,
			refundAmount: params.refundAmount,
			originalOrderTotal: params.originalOrderTotal,
			reason: params.reason,
			isPartialRefund: params.isPartialRefund,
			orderDetailsUrl: params.orderDetailsUrl,
		}),
		{
			to: params.to,
			subject: EMAIL_SUBJECTS.REFUND_APPROVED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "payment" }],
		},
	);
}

/**
 * Envoie un email au client lorsque sa demande de remboursement est annulée.
 */
export async function sendRefundCancelledEmail({
	to,
	orderNumber,
	customerName,
	refundAmount,
	orderDetailsUrl,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	orderDetailsUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(
		RefundCancelledEmail({
			orderNumber,
			customerName,
			refundAmount,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.REFUND_CANCELLED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "payment" }],
		},
	);
}

/**
 * Envoie un email au client lorsque sa demande de remboursement est rejetée.
 */
export async function sendRefundRejectedEmail({
	to,
	orderNumber,
	customerName,
	refundAmount,
	reason,
	orderDetailsUrl,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	reason?: string;
	orderDetailsUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(
		RefundRejectedEmail({
			orderNumber,
			customerName,
			refundAmount,
			reason,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.REFUND_REJECTED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "payment" }],
		},
	);
}
