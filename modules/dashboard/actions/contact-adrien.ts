"use server";

import { Resend } from "resend";
import {
	requireAuth,
	validateFormData,
	enforceRateLimitForCurrentUser,
	handleActionError,
} from "@/shared/lib/actions";
import { forbidden, success } from "@/shared/lib/actions/responses";
import { sanitizeForEmail, newlinesToBr } from "@/shared/lib/sanitize";
import { EMAIL_FROM, EMAIL_ADMIN } from "@/shared/lib/email-config";
import type { ActionState } from "@/shared/types/server-action";
import { contactAdrienSchema } from "../schemas/dashboard.schemas";
import { CONTACT_TYPES } from "../constants/contact-adrien.constants";

// Initialiser le client Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Server Action pour envoyer un email à Adrien (créateur du site)
 * Utilise le SDK Resend natif
 *
 * Protection:
 * - Nécessite un compte authentifié avec rôle ADMIN
 * - Rate limit: 5 emails par heure
 */
export async function contactAdrien(
	_previousState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting - 5 emails par heure
		const rateCheck = await enforceRateLimitForCurrentUser({
			limit: 5,
			windowMs: 60 * 60 * 1000, // 1 heure
		});
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérifier l'authentification
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;

		const { user } = auth;

		// 3. Vérifier le rôle admin
		if (user.role !== "ADMIN") {
			return forbidden(
				"Vous n'avez pas les permissions pour effectuer cette action"
			);
		}

		// 4. Extraction et validation des données
		const validated = validateFormData(
			formData,
			(fd) => ({
				type: fd.get("type"),
				message: fd.get("message"),
			}),
			contactAdrienSchema
		);

		if ("error" in validated) return validated.error;

		const { type, message } = validated.data;

		// 5. Labels pour les types de message (centralisés dans constants)
		const typeLabel =
			CONTACT_TYPES[type as keyof typeof CONTACT_TYPES]?.emailLabel ||
			"Message";

		// 6. Sanitizer le message pour l'HTML
		const sanitizedMessage = newlinesToBr(sanitizeForEmail(message));
		const sanitizedName = sanitizeForEmail(user.name || "Administrateur");
		const sanitizedEmail = sanitizeForEmail(user.email || "");

		// 7. Envoyer l'email avec SDK Resend
		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: EMAIL_ADMIN,
			replyTo: user.email || undefined,
			subject: `[Dashboard Synclune] ${typeLabel} - ${user.name || "Admin"}`,
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<style>
						body {
							font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
							line-height: 1.6;
							color: #333;
							max-width: 600px;
							margin: 0 auto;
							padding: 20px;
						}
						.header {
							background: linear-gradient(135deg, #ec4899 0%, #f59e0b 100%);
							color: white;
							padding: 20px;
							border-radius: 8px 8px 0 0;
						}
						.content {
							background: #f9fafb;
							padding: 30px;
							border: 1px solid #e5e7eb;
							border-top: none;
							border-radius: 0 0 8px 8px;
						}
						.label {
							font-weight: 600;
							color: #6b7280;
							text-transform: uppercase;
							font-size: 12px;
							margin-bottom: 8px;
						}
						.value {
							background: white;
							padding: 12px;
							border-radius: 6px;
							margin-bottom: 20px;
							border: 1px solid #e5e7eb;
						}
						.message {
							white-space: pre-wrap;
							word-wrap: break-word;
						}
						.footer {
							margin-top: 30px;
							padding-top: 20px;
							border-top: 1px solid #e5e7eb;
							font-size: 12px;
							color: #6b7280;
							text-align: center;
						}
					</style>
				</head>
				<body>
					<div class="header">
						<h1 style="margin: 0; font-size: 24px;">Nouveau message du dashboard</h1>
					</div>
					<div class="content">
						<div>
							<div class="label">Type de message</div>
							<div class="value">${typeLabel}</div>
						</div>

						<div>
							<div class="label">De</div>
							<div class="value">
								${sanitizedName}<br>
								<a href="mailto:${sanitizedEmail}" style="color: #ec4899;">${sanitizedEmail}</a>
							</div>
						</div>

						<div>
							<div class="label">Message</div>
							<div class="value message">${sanitizedMessage}</div>
						</div>

						<div class="footer">
							<p>Ce message a été envoyé depuis le dashboard Synclune Bijoux</p>
						</div>
					</div>
				</body>
				</html>
			`,
			text: `
Type: ${typeLabel}
De: ${user.name || "Admin"} (${user.email || ""})

Message:
${message}

---
Ce message a été envoyé depuis le dashboard Synclune Bijoux
			`.trim(),
		});

		if (error) {
			return handleActionError(
				error,
				"Une erreur est survenue lors de l'envoi du message"
			);
		}

		return success("Message envoyé avec succès", {
			messageId: data?.id,
		});
	} catch (error) {
		return handleActionError(
			error,
			"Une erreur est survenue lors de l'envoi du message"
		);
	}
}
