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
	const component = RefundConfirmationEmail({
		orderNumber,
		customerName,
		refundAmount,
		originalOrderTotal,
		reason,
		isPartialRefund,
		orderDetailsUrl,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.REFUND_CONFIRMATION,
		html,
		text,
		tags: [{ name: "category", value: "payment" }],
	})
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
	const component = RefundApprovedEmail({
		orderNumber,
		customerName,
		refundAmount,
		originalOrderTotal,
		reason,
		isPartialRefund,
		orderDetailsUrl,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.REFUND_APPROVED,
		html,
		text,
		tags: [{ name: "category", value: "payment" }],
	})
}
