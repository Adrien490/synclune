import { render } from "@react-email/components"
import { RefundConfirmationEmail } from "@/emails/refund-confirmation-email"
import { RefundApprovedEmail } from "@/emails/refund-approved-email"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { sendEmail } from "./send-email"
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
	const html = await render(
		RefundConfirmationEmail({
			orderNumber,
			customerName,
			refundAmount,
			originalOrderTotal,
			reason,
			isPartialRefund,
			orderDetailsUrl,
		})
	)
	console.log(
		`✅ [EMAIL] Refund confirmation sent to ${to} for order ${orderNumber}`
	)
	return sendEmail({ to, subject: EMAIL_SUBJECTS.REFUND_CONFIRMATION, html })
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
	const html = await render(
		RefundApprovedEmail({
			orderNumber,
			customerName,
			refundAmount,
			originalOrderTotal,
			reason,
			isPartialRefund,
			orderDetailsUrl,
		})
	)
	console.log(
		`✅ [EMAIL] Refund approved notification sent to ${to} for order ${orderNumber}`
	)
	return sendEmail({ to, subject: EMAIL_SUBJECTS.REFUND_APPROVED, html })
}
