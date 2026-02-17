import { NewsletterConfirmationEmail } from "@/emails/newsletter-confirmation-email"
import { NewsletterWelcomeEmail } from "@/emails/newsletter-welcome-email"
import { buildUrl, ROUTES } from "@/shared/constants/urls"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
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
	return renderAndSend(NewsletterConfirmationEmail({ confirmationUrl }), {
		to,
		subject: EMAIL_SUBJECTS.NEWSLETTER_CONFIRMATION,
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
	const shopUrl = buildUrl(ROUTES.SHOP.PRODUCTS)
	return renderAndSend(NewsletterWelcomeEmail({ email: to, unsubscribeUrl, shopUrl }), {
		to,
		subject: EMAIL_SUBJECTS.NEWSLETTER_WELCOME,
		headers: {
			"List-Unsubscribe": `<${unsubscribeUrl}>`,
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		},
		tags: [{ name: "category", value: "marketing" }],
	})
}
