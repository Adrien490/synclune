import { RefundConfirmationEmail } from "@/emails/refund-confirmation-email"
import { RefundApprovedEmail } from "@/emails/refund-approved-email"
import { RefundRejectedEmail } from "@/emails/refund-rejected-email"
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie un email de confirmation de remboursement au client
 */
export async function sendRefundConfirmationEmail({
	to,
	orderNumber,
	customerName,
	refundAmount,
	originalOrderTotal,
	reason,
	isPartialRefund,
	orderDetailsUrl,
}: {
	to: string
	orderNumber: string
	customerName: string
	refundAmount: number
	originalOrderTotal: number
	reason: string
	isPartialRefund: boolean
	orderDetailsUrl: string
}): Promise<EmailResult> {
	return renderAndSend(
		RefundConfirmationEmail({
			orderNumber,
			customerName,
			refundAmount,
			originalOrderTotal,
			reason,
			isPartialRefund,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.REFUND_CONFIRMATION,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "payment" }],
		},
	)
}

/**
 * Envoie un email au client lorsque sa demande de remboursement est approuvee
 */
export async function sendRefundApprovedEmail({
	to,
	orderNumber,
	customerName,
	refundAmount,
	originalOrderTotal,
	reason,
	isPartialRefund,
	orderDetailsUrl,
}: {
	to: string
	orderNumber: string
	customerName: string
	refundAmount: number
	originalOrderTotal: number
	reason: string
	isPartialRefund: boolean
	orderDetailsUrl: string
}): Promise<EmailResult> {
	return renderAndSend(
		RefundApprovedEmail({
			orderNumber,
			customerName,
			refundAmount,
			originalOrderTotal,
			reason,
			isPartialRefund,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.REFUND_APPROVED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "payment" }],
		},
	)
}

/**
 * Envoie un email au client lorsque sa demande de remboursement est rejetee
 */
export async function sendRefundRejectedEmail({
	to,
	orderNumber,
	customerName,
	refundAmount,
	reason,
	orderDetailsUrl,
}: {
	to: string
	orderNumber: string
	customerName: string
	refundAmount: number
	reason?: string
	orderDetailsUrl: string
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
	)
}
