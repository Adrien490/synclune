import { CancelOrderConfirmationEmail } from "@/emails/cancel-order-confirmation-email"
import { ReturnConfirmationEmail } from "@/emails/return-confirmation-email"
import { RevertShippingNotificationEmail } from "@/emails/revert-shipping-notification-email"
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie un email de confirmation d'annulation de commande au client
 */
export async function sendCancelOrderConfirmationEmail({
	to,
	orderNumber,
	customerName,
	orderTotal,
	reason,
	wasRefunded,
	orderDetailsUrl,
}: {
	to: string
	orderNumber: string
	customerName: string
	orderTotal: number
	reason?: string
	wasRefunded: boolean
	orderDetailsUrl: string
}): Promise<EmailResult> {
	return renderAndSend(
		CancelOrderConfirmationEmail({
			orderNumber,
			customerName,
			orderTotal,
			reason,
			wasRefunded,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_CANCELLED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
		},
	)
}

/**
 * Envoie un email de confirmation de retour au client
 */
export async function sendReturnConfirmationEmail({
	to,
	orderNumber,
	customerName,
	orderTotal,
	reason,
	orderDetailsUrl,
}: {
	to: string
	orderNumber: string
	customerName: string
	orderTotal: number
	reason?: string
	orderDetailsUrl: string
}): Promise<EmailResult> {
	return renderAndSend(
		ReturnConfirmationEmail({
			orderNumber,
			customerName,
			orderTotal,
			reason,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_RETURNED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
		},
	)
}

/**
 * Envoie un email de notification d'annulation d'expedition au client
 */
export async function sendRevertShippingNotificationEmail({
	to,
	orderNumber,
	customerName,
	reason,
	orderDetailsUrl,
}: {
	to: string
	orderNumber: string
	customerName: string
	reason: string
	orderDetailsUrl: string
}): Promise<EmailResult> {
	return renderAndSend(
		RevertShippingNotificationEmail({
			orderNumber,
			customerName,
			reason,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_SHIPPING_REVERTED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
		},
	)
}
