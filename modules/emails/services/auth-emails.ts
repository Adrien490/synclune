import { render } from "@react-email/components"
import { VerificationEmail } from "@/emails/verification-email"
import { PasswordResetEmail } from "@/emails/password-reset-email"
import { PasswordChangedEmail } from "@/emails/password-changed-email"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { sendEmail } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie un email de verification d'adresse email
 */
export async function sendVerificationEmail({
	to,
	url,
}: {
	to: string
	url: string
	token: string
}): Promise<EmailResult> {
	const html = await render(VerificationEmail({ verificationUrl: url }))
	return sendEmail({ to, subject: EMAIL_SUBJECTS.VERIFICATION, html })
}

/**
 * Envoie un email de reinitialisation de mot de passe
 */
export async function sendPasswordResetEmail({
	to,
	url,
}: {
	to: string
	url: string
	token: string
}): Promise<EmailResult> {
	const html = await render(PasswordResetEmail({ resetUrl: url }))
	return sendEmail({ to, subject: EMAIL_SUBJECTS.PASSWORD_RESET, html })
}

/**
 * Envoie un email de notification apres changement de mot de passe
 */
export async function sendPasswordChangedEmail({
	to,
	userName,
	changeDate,
}: {
	to: string
	userName: string
	changeDate: string
	ipAddress?: string
}): Promise<EmailResult> {
	const resetUrl = `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"}/mot-de-passe-oublie`
	const html = await render(
		PasswordChangedEmail({ userName, changeDate, resetUrl })
	)
	return sendEmail({ to, subject: EMAIL_SUBJECTS.PASSWORD_CHANGED, html })
}
