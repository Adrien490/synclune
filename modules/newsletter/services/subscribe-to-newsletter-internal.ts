import { NewsletterStatus } from "@/app/generated/prisma/client";
import { sendNewsletterConfirmationEmail } from "@/modules/emails/services/newsletter-emails";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { randomUUID } from "crypto";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";
import { NEWSLETTER_BASE_URL } from "../constants/urls.constants";
import { ROUTES } from "@/shared/constants/urls";

interface SubscribeToNewsletterInternalParams {
	email: string;
	ipAddress: string;
	userAgent: string;
	consentSource: "newsletter_form" | "contact_form" | "account_settings" | "checkout_form";
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
		// Vérifier si l'email existe déjà (exclude soft-deleted)
		const existingSubscriber = await prisma.newsletterSubscriber.findFirst({
			where: { email, ...notDeleted },
		});

		if (existingSubscriber) {
			// If already confirmed, return generic message to prevent email enumeration
			if (existingSubscriber.status === NewsletterStatus.CONFIRMED) {
				return {
					success: true,
					message:
						"Si cette adresse n'est pas encore inscrite, un email de confirmation vous a été envoyé.",
					alreadySubscribed: true,
				};
			}

			// Si l'abonné est en attente de confirmation → Renvoyer email de confirmation
			if (existingSubscriber.status === NewsletterStatus.PENDING) {
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
				getNewsletterInvalidationTags(existingSubscriber.userId ?? undefined).forEach((tag) =>
					updateTag(tag),
				);

				// Envoyer l'email de confirmation
				const confirmationUrl = `${NEWSLETTER_BASE_URL}${ROUTES.NEWSLETTER.CONFIRM}?token=${confirmationToken}`;
				await sendNewsletterConfirmationEmail({
					to: email,
					confirmationUrl,
				});

				return {
					success: true,
					message:
						"Si cette adresse n'est pas encore inscrite, un email de confirmation vous a été envoyé.",
				};
			}

			// Si l'abonné s'était désabonné → Renvoyer email de confirmation
			// (nécessaire pour re-valider le consentement RGPD et confirmer que l'email est toujours valide)
			const confirmationToken = randomUUID();

			await prisma.newsletterSubscriber.update({
				where: { email },
				data: {
					confirmationToken,
					confirmationSentAt: new Date(),
					status: NewsletterStatus.PENDING, // Repasse en attente de confirmation
					unsubscribeToken: randomUUID(), // Regenerate to invalidate old unsubscribe URLs
				},
			});

			// Invalider le cache
			getNewsletterInvalidationTags(existingSubscriber.userId ?? undefined).forEach((tag) =>
				updateTag(tag),
			);

			// Envoyer l'email de confirmation
			const confirmationUrl = `${NEWSLETTER_BASE_URL}${ROUTES.NEWSLETTER.CONFIRM}?token=${confirmationToken}`;
			await sendNewsletterConfirmationEmail({
				to: email,
				confirmationUrl,
			});

			return {
				success: true,
				message:
					"Si cette adresse n'est pas encore inscrite, un email de confirmation vous a été envoyé.",
			};
		}

		// Créer un nouvel abonné avec traçabilité RGPD et double opt-in
		const confirmationToken = randomUUID();

		await prisma.newsletterSubscriber.create({
			data: {
				email,
				unsubscribeToken: randomUUID(),
				ipAddress,
				userAgent,
				consentSource,
				consentTimestamp: new Date(),
				confirmationToken,
				confirmationSentAt: new Date(),
				status: NewsletterStatus.PENDING,
			},
		});

		// Invalider le cache (new subscriber, no userId yet)
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		// Envoyer l'email de confirmation
		const confirmationUrl = `${NEWSLETTER_BASE_URL}${ROUTES.NEWSLETTER.CONFIRM}?token=${confirmationToken}`;
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
		logger.error("Newsletter subscription failed", error, {
			service: "subscribe-to-newsletter-internal",
		});
		return {
			success: false,
			message:
				"Une erreur est survenue lors de l'inscription à la newsletter. Veuillez réessayer plus tard.",
		};
	}
}
