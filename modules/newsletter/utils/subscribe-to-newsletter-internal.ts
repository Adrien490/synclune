"use server";

import { sendNewsletterConfirmationEmail } from "@/shared/lib/email";
import { prisma } from "@/shared/lib/prisma";
import { randomUUID } from "crypto";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";
import { NEWSLETTER_BASE_URL } from "../constants/urls";

interface SubscribeToNewsletterInternalParams {
	email: string;
	ipAddress: string;
	userAgent: string;
	consentSource: "newsletter_form" | "contact_form";
}

interface SubscribeToNewsletterInternalResult {
	success: boolean;
	message: string;
	alreadySubscribed?: boolean;
}

/**
 * Fonction utilitaire interne pour souscrire à la newsletter
 * Peut être appelée depuis différentes actions serveur (contact, newsletter, etc.)
 * Implémente le double opt-in avec email de confirmation
 */
export async function subscribeToNewsletterInternal({
	email,
	ipAddress,
	userAgent,
	consentSource,
}: SubscribeToNewsletterInternalParams): Promise<SubscribeToNewsletterInternalResult> {
	try {
		// Vérifier si l'email existe déjà
		const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
			where: { email },
		});

		if (existingSubscriber) {
			// Si l'abonné existe et est actif ET email vérifié
			if (existingSubscriber.isActive && existingSubscriber.emailVerified) {
				return {
					success: true,
					message: "Vous êtes déjà inscrit(e) à la newsletter",
					alreadySubscribed: true,
				};
			}

			// Si l'abonné existe mais email non vérifié → Renvoyer email de confirmation
			if (!existingSubscriber.emailVerified) {
				// Régénérer un nouveau token de confirmation (sécurisé avec crypto)
				const confirmationToken = randomUUID();

				await prisma.newsletterSubscriber.update({
					where: { email },
					data: {
						confirmationToken,
						confirmationSentAt: new Date(),
					},
				});

				// Invalider le cache
				getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

				// Envoyer l'email de confirmation
				const confirmationUrl = `${NEWSLETTER_BASE_URL}/newsletter/confirm?token=${confirmationToken}`;
				await sendNewsletterConfirmationEmail({
					to: email,
					confirmationUrl,
				});

				return {
					success: true,
					message:
						"Un email de confirmation vous a été renvoyé ! Veuillez vérifier votre boîte de réception.",
				};
			}

			// Si l'abonné existe mais s'était désabonné → Renvoyer email de confirmation
			// (nécessaire pour re-valider le consentement RGPD et confirmer que l'email est toujours valide)
			const confirmationToken = randomUUID();

			await prisma.newsletterSubscriber.update({
				where: { email },
				data: {
					confirmationToken,
					confirmationSentAt: new Date(),
					isActive: false, // Sera réactivé après confirmation
					emailVerified: false, // Demander une nouvelle vérification
				},
			});

			// Invalider le cache
			getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

			// Envoyer l'email de confirmation
			const confirmationUrl = `${NEWSLETTER_BASE_URL}/newsletter/confirm?token=${confirmationToken}`;
			await sendNewsletterConfirmationEmail({
				to: email,
				confirmationUrl,
			});

			return {
				success: true,
				message:
					"Bienvenue à nouveau ! Un email de confirmation vous a été envoyé pour réactiver votre inscription.",
			};
		}

		// Créer un nouvel abonné avec traçabilité RGPD et double opt-in
		const confirmationToken = randomUUID();

		await prisma.newsletterSubscriber.create({
			data: {
				email,
				ipAddress,
				userAgent,
				consentSource,
				consentTimestamp: new Date(),
				confirmationToken,
				confirmationSentAt: new Date(),
				isActive: false, // Sera activé après confirmation email
				emailVerified: false,
			},
		});

		// Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		// Envoyer l'email de confirmation
		const confirmationUrl = `${NEWSLETTER_BASE_URL}/newsletter/confirm?token=${confirmationToken}`;
		await sendNewsletterConfirmationEmail({
			to: email,
			confirmationUrl,
		});

		return {
			success: true,
			message:
				"Merci ! Un email de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception 📧",
		};
	} catch (error) {
		return {
			success: false,
			message:
				"Une erreur est survenue lors de l'inscription à la newsletter. Veuillez réessayer plus tard.",
		};
	}
}
