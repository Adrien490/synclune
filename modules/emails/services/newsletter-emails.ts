import { render } from "@react-email/components"
import { NewsletterConfirmationEmail } from "@/emails/newsletter-confirmation-email"
import { NewsletterWelcomeEmail } from "@/emails/newsletter-welcome-email"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { sendEmail } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie un email de confirmation d'inscription a la newsletter
 */
export async function sendNewsletterConfirmationEmail({
	to,
	confirmationUrl,
}: {
	to: string
	confirmationUrl: string
}): Promise<EmailResult> {
	const component = NewsletterConfirmationEmail({ confirmationUrl })
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.NEWSLETTER_CONFIRMATION,
		html,
		text,
		tags: [{ name: "category", value: "marketing" }],
	})
}

/**
 * Envoie un email de bienvenue apres confirmation d'inscription a la newsletter
 */
export async function sendNewsletterWelcomeEmail({
	to,
	unsubscribeUrl,
}: {
	to: string
	unsubscribeUrl: string
}): Promise<EmailResult> {
	const component = NewsletterWelcomeEmail({ email: to, unsubscribeUrl })
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.NEWSLETTER_WELCOME,
		html,
		text,
		headers: {
			"List-Unsubscribe": `<${unsubscribeUrl}>`,
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		},
		tags: [{ name: "category", value: "marketing" }],
	})
}
