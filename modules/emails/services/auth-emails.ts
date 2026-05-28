import { VerificationEmail } from "@/emails/verification-email";
import { PasswordResetEmail } from "@/emails/password-reset-email";
import { AccountDeletionEmail } from "@/emails/account-deletion-email";
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

/**
 * Envoie un email de confirmation de suppression de compte
 */
export async function sendAccountDeletionEmail({
	to,
	userName,
	deletionDate,
	idempotencyKey,
}: {
	to: string;
	userName: string;
	deletionDate: string;
	/**
	 * EMAIL-AUDIT-107 : dedup cross-instance Resend 24h. Le flag DB
	 * `User.anonymizedAt` exclut déjà le compte des runs suivants, mais si le cron
	 * `process-account-deletions` est rejoué sur une autre instance avant que l'état
	 * DB ne soit visible, cette clé (`account-deletion:${userId}`) empêche un second
	 * email de confirmation de suppression.
	 */
	idempotencyKey?: string;
}): Promise<EmailResult> {
	return renderAndSend(AccountDeletionEmail({ userName, deletionDate }), {
		to,
		subject: EMAIL_SUBJECTS.ACCOUNT_DELETED,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "auth" }],
		...(idempotencyKey ? { idempotencyKey } : {}),
	});
}
