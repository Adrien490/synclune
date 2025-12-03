"use server";

import { NewsletterStatus } from "@/app/generated/prisma";
import { ajNewsletterConfirm } from "@/shared/lib/arcjet";
import { sendNewsletterWelcomeEmail } from "@/shared/lib/email";
import { prisma } from "@/shared/lib/prisma";
import { getClientIp } from "@/shared/lib/rate-limit";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";

export async function confirmSubscription(
	_previousState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 🛡️ Protection Arcjet : Shield + Rate Limiting contre brute-force
		const headersList = await headers();
		const request = new Request("http://localhost/newsletter/confirm", {
			method: "POST",
			headers: headersList,
		});

		const decision = await ajNewsletterConfirm.protect(request, {
			requested: 1,
		});

		// Bloquer si Arcjet détecte une menace
		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Trop de tentatives de confirmation. Veuillez réessayer dans quelques minutes 💝",
				};
			}

			if (decision.reason.isShield()) {
				console.warn("[CONFIRM_SUBSCRIPTION] Shield blocked suspicious request");
				return {
					status: ActionStatus.ERROR,
					message:
						"Votre requête a été bloquée pour des raisons de sécurité.",
				};
			}

			return {
				status: ActionStatus.ERROR,
				message: "Votre requête n'a pas pu être traitée. Veuillez réessayer.",
			};
		}

		const token = formData.get("token");

		// Validation type du token
		if (!token || typeof token !== "string") {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Token de confirmation manquant",
			};
		}

		// Validation format UUID du token (randomUUID génère des UUIDs v4)
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(token)) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Token de confirmation invalide",
			};
		}

		// Trouver l'abonné avec ce token
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { confirmationToken: token },
		});

		if (!subscriber) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Lien de confirmation invalide ou expiré. Veuillez vous réinscrire.",
			};
		}

		// Vérifier si l'abonnement est déjà confirmé
		if (subscriber.status === NewsletterStatus.CONFIRMED) {
			return {
				status: ActionStatus.SUCCESS,
				message: "Votre email est déjà confirmé ! Vous êtes bien inscrit(e).",
			};
		}

		// Vérifier si le token n'est pas expiré (7 jours)
		// Validation robuste de confirmationSentAt
		if (!subscriber.confirmationSentAt) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Lien de confirmation invalide. Veuillez vous réinscrire.",
			};
		}

		const tokenAge =
			Date.now() - new Date(subscriber.confirmationSentAt).getTime();
		const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

		if (tokenAge > sevenDaysInMs) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Ce lien de confirmation a expiré (validité : 7 jours). Veuillez vous réinscrire pour recevoir un nouveau lien.",
			};
		}

		// Récupérer l'IP de confirmation pour traçabilité RGPD
		const confirmationIpAddress = (await getClientIp(headersList)) || "unknown";

		// Activer l'abonné
		await prisma.newsletterSubscriber.update({
			where: { id: subscriber.id },
			data: {
				status: NewsletterStatus.CONFIRMED,
				confirmedAt: new Date(),
				confirmationIpAddress,
				subscribedAt: new Date(), // Mettre à jour la date d'inscription
				unsubscribedAt: null, // Réinitialiser la date de désabonnement
				// Nettoyer le token après confirmation
				confirmationToken: null,
			},
		});

		// Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		// Envoyer l'email de bienvenue après confirmation
		// Note : Envoi en arrière-plan, ne bloque pas la réponse si échec
		try {
			await sendNewsletterWelcomeEmail({ to: subscriber.email });
		} catch (error) {
			// Log l'erreur mais ne pas bloquer la confirmation
			// L'utilisateur est bien inscrit même si l'email de bienvenue échoue
			console.error("[CONFIRM_SUBSCRIPTION] Erreur envoi email bienvenue:", error);
		}

		return {
			status: ActionStatus.SUCCESS,
			message:
				"Merci ! Votre inscription est confirmée 🎉 Vous recevrez bientôt notre prochaine newsletter.",
		};
	} catch (error) {
		console.error("[CONFIRM_SUBSCRIPTION] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}
