import { VerificationEmail } from "@/emails/verification-email"
import { PasswordResetEmail } from "@/emails/password-reset-email"
import { PasswordChangedEmail } from "@/emails/password-changed-email"
import { AccountDeletionEmail } from "@/emails/account-deletion-email"
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
import { buildUrl, ROUTES } from "@/shared/constants/urls"
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
}): Promise<EmailResult> {
	return renderAndSend(VerificationEmail({ verificationUrl: url }), {
		to,
		subject: EMAIL_SUBJECTS.VERIFICATION,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "auth" }],
	})
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
}): Promise<EmailResult> {
	return renderAndSend(PasswordResetEmail({ resetUrl: url }), {
		to,
		subject: EMAIL_SUBJECTS.PASSWORD_RESET,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "auth" }],
	})
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
}): Promise<EmailResult> {
	const resetUrl = buildUrl(ROUTES.AUTH.FORGOT_PASSWORD)
	return renderAndSend(PasswordChangedEmail({ userName, changeDate, resetUrl }), {
		to,
		subject: EMAIL_SUBJECTS.PASSWORD_CHANGED,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "auth" }],
	})
}

/**
 * Envoie un email de confirmation de suppression de compte
 */
export async function sendAccountDeletionEmail({
	to,
	userName,
	deletionDate,
}: {
	to: string
	userName: string
	deletionDate: string
}): Promise<EmailResult> {
	return renderAndSend(AccountDeletionEmail({ userName, deletionDate }), {
		to,
		subject: EMAIL_SUBJECTS.ACCOUNT_DELETED,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "auth" }],
	})
}
