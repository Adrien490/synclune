import { render } from "@react-email/components"
import { PaymentFailedEmail } from "@/emails/payment-failed-email"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { sendEmail } from "./send-email"
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
	const component = PaymentFailedEmail({ orderNumber, customerName, retryUrl })
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.PAYMENT_FAILED,
		html,
		text,
		tags: [{ name: "category", value: "payment" }],
	})
}
