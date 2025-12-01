"use server";

import { auth } from "@/modules/auth/lib/auth";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import nodemailer from "nodemailer";
import { contactAdrienSchema } from "../schemas/dashboard.schemas";
import { CONTACT_TYPES } from "../constants/contact-adrien.constants";

/**
 * Échappe les caractères HTML pour prévenir les injections XSS
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Server Action pour envoyer un email à Adrien (créateur du site)
 * Utilise Nodemailer avec SMTP Resend
 *
 * Protection: Nécessite un compte ADMIN
 */
export async function contactAdrien(
	_previousState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérifier l'authentification et le rôle admin
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session?.user) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action",
			};
		}

		if (session.user.role !== "ADMIN") {
			return {
				status: ActionStatus.FORBIDDEN,
				message: "Vous n'avez pas les permissions pour effectuer cette action",
			};
		}

		// 2. Extraction et validation des données
		const type = formData.get("type");
		const message = formData.get("message");

		const result = contactAdrienSchema.safeParse({ type, message });

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const { type: validatedType, message: validatedMessage } = result.data;

		// 3. Vérifier que la clé API Resend est configurée
		const resendApiKey = process.env.RESEND_API_KEY;
		if (!resendApiKey) {
			return {
				status: ActionStatus.ERROR,
				message: "Configuration email manquante",
			};
		}

		// 4. Configurer le transporteur Nodemailer avec SMTP Resend
		const transporter = nodemailer.createTransport({
			host: "smtp.resend.com",
			secure: true,
			port: 465,
			auth: {
				user: "resend",
				pass: resendApiKey,
			},
		});

		// 5. Labels pour les types de message (centralisés dans constants)
		const typeLabel =
			CONTACT_TYPES[validatedType as keyof typeof CONTACT_TYPES]?.emailLabel ||
			"Message";

		// 6. Envoyer l'email
		const info = await transporter.sendMail({
			from: session.user.email,
			to: process.env.CONTACT_ADRIEN_EMAIL || "contact@adrienpoirier.fr",
			replyTo: session.user.email,
			subject: `[Dashboard Synclune] ${typeLabel} - ${session.user.name}`,
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
								${escapeHtml(session.user.name || "")}<br>
								<a href="mailto:${escapeHtml(session.user.email || "")}" style="color: #ec4899;">${escapeHtml(session.user.email || "")}</a>
							</div>
						</div>

						<div>
							<div class="label">Message</div>
							<div class="value message">${escapeHtml(validatedMessage).replace(/\n/g, "<br>")}</div>
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
De: ${session.user.name} (${session.user.email})

Message:
${validatedMessage}

---
Ce message a été envoyé depuis le dashboard Synclune Bijoux
			`.trim(),
		});

		return {
			status: ActionStatus.SUCCESS,
			message: "Message envoyé avec succès",
			data: {
				messageId: info.messageId,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de l'envoi du message",
		};
	}
}
