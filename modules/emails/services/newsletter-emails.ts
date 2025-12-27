import { render } from "@react-email/components"
import { NewsletterEmail } from "@/emails/newsletter-email"
import { NewsletterConfirmationEmail } from "@/emails/newsletter-confirmation-email"
import { NewsletterWelcomeEmail } from "@/emails/newsletter-welcome-email"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { sendEmail } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie un email de newsletter a un abonne
 */
export async function sendNewsletterEmail({
	to,
	subject,
	content,
	unsubscribeUrl,
}: {
	to: string
	subject: string
	content: string
	unsubscribeUrl: string
}): Promise<EmailResult> {
	const html = await render(
		NewsletterEmail({ subject, content, unsubscribeUrl })
	)
	return sendEmail({ to, subject: subject || EMAIL_SUBJECTS.NEWSLETTER, html })
}

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
	const html = await render(NewsletterConfirmationEmail({ confirmationUrl }))
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.NEWSLETTER_CONFIRMATION,
		html,
	})
}

/**
 * Envoie un email de bienvenue apres confirmation d'inscription a la newsletter
 */
export async function sendNewsletterWelcomeEmail({
	to,
}: {
	to: string
}): Promise<EmailResult> {
	const html = await render(NewsletterWelcomeEmail({ email: to }))
	return sendEmail({ to, subject: EMAIL_SUBJECTS.NEWSLETTER_WELCOME, html })
}
