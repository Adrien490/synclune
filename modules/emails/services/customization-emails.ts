import { render } from "@react-email/components"
import { CustomizationRequestEmail } from "@/emails/customization-request-email"
import { CustomizationConfirmationEmail } from "@/emails/customization-confirmation-email"
import { EMAIL_SUBJECTS, EMAIL_ADMIN } from "../constants/email.constants"
import { sendEmail } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie une notification admin pour une nouvelle demande de personnalisation
 */
export async function sendCustomizationRequestEmail({
	firstName,
	email,
	phone,
	productTypeLabel,
	details,
	inspirationProducts,
}: {
	firstName: string
	email: string
	phone?: string
	productTypeLabel: string
	details: string
	inspirationProducts?: Array<{ title: string }>
}): Promise<EmailResult> {
	const component = CustomizationRequestEmail({
		firstName,
		email,
		phone,
		productTypeLabel,
		details,
		inspirationProducts,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to: EMAIL_ADMIN,
		subject: `${EMAIL_SUBJECTS.CUSTOMIZATION_REQUEST} - ${firstName}`,
		html,
		text,
		replyTo: email,
		tags: [{ name: "category", value: "order" }],
	})
}

/**
 * Envoie un email de confirmation au client pour sa demande de personnalisation
 */
export async function sendCustomizationConfirmationEmail({
	firstName,
	email,
	productTypeLabel,
	details,
	inspirationProducts,
}: {
	firstName: string
	email: string
	productTypeLabel: string
	details: string
	inspirationProducts?: Array<{ title: string }>
}): Promise<EmailResult> {
	const component = CustomizationConfirmationEmail({
		firstName,
		productTypeLabel,
		details,
		inspirationProducts,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to: email,
		subject: EMAIL_SUBJECTS.CUSTOMIZATION_CONFIRMATION,
		html,
		text,
		tags: [{ name: "category", value: "order" }],
	})
}
