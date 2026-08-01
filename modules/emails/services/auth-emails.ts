import { VerificationEmail } from "@/emails/verification-email";
import { PasswordResetEmail } from "@/emails/password-reset-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

/**
 * Envoie un email de verification d'adresse email
 */
export async function sendVerificationEmail({
	to,
	url,
}: {
	to: string;
	url: string;
}): Promise<EmailResult> {
	return renderAndSend(VerificationEmail({ verificationUrl: url }), {
		to,
		subject: EMAIL_SUBJECTS.VERIFICATION,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "auth" }],
	});
}

/**
 * Envoie un email de reinitialisation de mot de passe
 */
export async function sendPasswordResetEmail({
	to,
	url,
}: {
	to: string;
	url: string;
}): Promise<EmailResult> {
	return renderAndSend(PasswordResetEmail({ resetUrl: url }), {
		to,
		subject: EMAIL_SUBJECTS.PASSWORD_RESET,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "auth" }],
	});
}
