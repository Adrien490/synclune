import { PaymentFailedEmail } from "@/emails/payment-failed-email"
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie un email au client lorsque son paiement asynchrone (SEPA, etc.) echoue
 */
export async function sendPaymentFailedEmail({
	to,
	customerName,
	orderNumber,
	retryUrl,
}: {
	to: string
	customerName: string
	orderNumber: string
	retryUrl: string
}): Promise<EmailResult> {
	return renderAndSend(PaymentFailedEmail({ orderNumber, customerName, retryUrl }), {
		to,
		subject: EMAIL_SUBJECTS.PAYMENT_FAILED,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "payment" }],
	})
}
