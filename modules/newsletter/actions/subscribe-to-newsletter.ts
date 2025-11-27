"use server";

import { ajNewsletter } from "@/shared/lib/arcjet";
import { sendNewsletterConfirmationEmail } from "@/shared/lib/email";
import { prisma } from "@/shared/lib/prisma";
import { getClientIp } from "@/shared/lib/rate-limit";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { subscribeToNewsletterSchema } from "@/modules/newsletter/schemas/newsletter.schemas";

export async function subscribeToNewsletter(
	_previousState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// Récupérer les informations de traçabilité RGPD
		const headersList = await headers();
		const ipAddress = (await getClientIp(headersList)) || "unknown";
		const userAgent = headersList.get("user-agent") || "unknown";

		// 🛡️ Protection Arcjet : Shield + Bot Detection + Rate Limiting
		const request = new Request("http://localhost/newsletter/subscribe", {
			method: "POST",
			headers: headersList,
		});

		const decision = await ajNewsletter.protect(request, { requested: 1 });

		// Bloquer si Arcjet détecte une menace
		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Trop de tentatives d'inscription. Veuillez réessayer dans quelques minutes 💝",
				};
			}

			if (decision.reason.isBot()) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Votre requête semble provenir d'un bot. Veuillez réessayer depuis un navigateur normal.",
				};
			}

			if (decision.reason.isShield()) {
				return {
					status: ActionStatus.ERROR,
					message: "Votre requête a été bloquée pour des raisons de sécurité.",
				};
			}

			// Autre raison de blocage
			return {
				status: ActionStatus.ERROR,
				message: "Votre requête n'a pas pu être traitée. Veuillez réessayer.",
			};
		}

		// Validation avec Zod
		const email = formData.get("email");
		const consent = formData.get("consent") === "true";
		const result = subscribeToNewsletterSchema.safeParse({ email, consent });

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Veuillez remplir les champs obligatoires",
			};
		}

		const { email: validatedEmail } = result.data;

		// Vérifier si l'email existe déjà
		const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
			where: { email: validatedEmail },
		});

		if (existingSubscriber) {
			// Si l'abonné existe et est actif ET email vérifié
			if (existingSubscriber.isActive && existingSubscriber.emailVerified) {
				return {
					status: ActionStatus.CONFLICT,
					message: "Vous êtes déjà inscrit(e) à la newsletter",
				};
			}

			// Si l'abonné existe mais email non vérifié → Renvoyer email de confirmation
			if (!existingSubscriber.emailVerified) {
				// Régénérer un nouveau token de confirmation (sécurisé avec crypto)
				const confirmationToken = randomUUID();

				await prisma.newsletterSubscriber.update({
					where: { email: validatedEmail },
					data: {
						confirmationToken,
						confirmationSentAt: new Date(),
					},
				});

				// Envoyer l'email de confirmation
				const baseUrl = process.env.BETTER_AUTH_URL || "https://synclune.fr";
				const confirmationUrl = `${baseUrl}/newsletter/confirm?token=${confirmationToken}`;
				await sendNewsletterConfirmationEmail({
					to: validatedEmail,
					confirmationUrl,
				});

				return {
					status: ActionStatus.SUCCESS,
					message:
						"Un email de confirmation vous a été renvoyé ! Veuillez vérifier votre boîte de réception 📧",
				};
			}

			// Si l'abonné existe mais s'était désabonné → Renvoyer email de confirmation
			// (nécessaire pour re-valider le consentement RGPD et confirmer que l'email est toujours valide)
			const confirmationToken = randomUUID();

			await prisma.newsletterSubscriber.update({
				where: { email: validatedEmail },
				data: {
					confirmationToken,
					confirmationSentAt: new Date(),
					isActive: false, // Sera réactivé après confirmation
					emailVerified: false, // Demander une nouvelle vérification
				},
			});

			// Envoyer l'email de confirmation
			const baseUrl = process.env.BETTER_AUTH_URL || "https://synclune.fr";
			const confirmationUrl = `${baseUrl}/newsletter/confirm?token=${confirmationToken}`;
			await sendNewsletterConfirmationEmail({
				to: validatedEmail,
				confirmationUrl,
			});

			return {
				status: ActionStatus.SUCCESS,
				message:
					"Bienvenue à nouveau ! Un email de confirmation vous a été envoyé pour réactiver votre inscription 📧",
			};
		}

		// Créer un nouvel abonné avec traçabilité RGPD et double opt-in
		const confirmationToken = randomUUID();

		await prisma.newsletterSubscriber.create({
			data: {
				email: validatedEmail,
				ipAddress,
				userAgent,
				consentSource: "newsletter_form",
				consentTimestamp: new Date(),
				confirmationToken,
				confirmationSentAt: new Date(),
				isActive: false, // Sera activé après confirmation email
				emailVerified: false,
			},
		});

		// Envoyer l'email de confirmation
		const baseUrl = process.env.BETTER_AUTH_URL || "https://synclune.fr";
		const confirmationUrl = `${baseUrl}/newsletter/confirm?token=${confirmationToken}`;
		await sendNewsletterConfirmationEmail({
			to: validatedEmail,
			confirmationUrl,
		});

		return {
			status: ActionStatus.SUCCESS,
			message:
				"Merci ! Un email de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception 📧",
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}
