import { CustomizationRequestEmail } from "@/emails/customization-request-email"
import { CustomizationConfirmationEmail } from "@/emails/customization-confirmation-email"
import { CustomizationStatusEmail } from "@/emails/customization-status-email"
import { EMAIL_SUBJECTS, EMAIL_ADMIN, EMAIL_CONTACT } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
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
	return renderAndSend(
		CustomizationRequestEmail({
			firstName,
			email,
			phone,
			productTypeLabel,
			details,
			inspirationProducts,
		}),
		{
			to: EMAIL_ADMIN,
			subject: `${EMAIL_SUBJECTS.CUSTOMIZATION_REQUEST} - ${firstName}`,
			replyTo: email,
			tags: [{ name: "category", value: "customization" }],
		}
	)
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
	return renderAndSend(
		CustomizationConfirmationEmail({
			firstName,
			productTypeLabel,
			details,
			inspirationProducts,
		}),
		{
			to: email,
			subject: EMAIL_SUBJECTS.CUSTOMIZATION_CONFIRMATION,
			tags: [{ name: "category", value: "customization" }],
		}
	)
}

const CUSTOMIZATION_STATUS_SUBJECTS: Record<string, string> = {
	IN_PROGRESS: EMAIL_SUBJECTS.CUSTOMIZATION_IN_PROGRESS,
	COMPLETED: EMAIL_SUBJECTS.CUSTOMIZATION_COMPLETED,
	CANCELLED: EMAIL_SUBJECTS.CUSTOMIZATION_CANCELLED,
}

/**
 * Envoie un email de mise a jour de statut de personnalisation au client
 */
export async function sendCustomizationStatusEmail({
	email,
	firstName,
	productTypeLabel,
	status,
	adminNotes,
	details,
}: {
	email: string
	firstName: string
	productTypeLabel: string
	status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
	adminNotes?: string | null
	details: string
}): Promise<EmailResult> {
	return renderAndSend(
		CustomizationStatusEmail({
			firstName,
			productTypeLabel,
			status,
			adminNotes,
			details,
		}),
		{
			to: email,
			subject: CUSTOMIZATION_STATUS_SUBJECTS[status] || EMAIL_SUBJECTS.CUSTOMIZATION_IN_PROGRESS,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "customization" }],
		}
	)
}
