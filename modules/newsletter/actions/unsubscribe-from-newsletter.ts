"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { ajNewsletterUnsubscribe } from "@/shared/lib/arcjet";
import { prisma } from "@/shared/lib/prisma";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { unsubscribeFromNewsletterSchema } from "@/modules/newsletter/schemas/newsletter.schemas";
import { getNewsletterInvalidationTags } from "../constants/cache";

export async function unsubscribeFromNewsletter(
	_previousState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// Protection Arcjet : Shield + Rate Limiting
		const headersList = await headers();
		const request = new Request("http://localhost/newsletter/unsubscribe", {
			method: "POST",
			headers: headersList,
		});

		const decision = await ajNewsletterUnsubscribe.protect(request, {
			requested: 1,
		});

		// Bloquer si Arcjet détecte une menace
		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return error("Trop de tentatives de désinscription. Veuillez réessayer dans quelques minutes.");
			}

			if (decision.reason.isShield()) {
				return error("Votre requête a été bloquée pour des raisons de sécurité.");
			}

			// Autre raison de blocage
			return error("Votre requête n'a pas pu être traitée. Veuillez réessayer.");
		}

		// Validation avec Zod
		const email = formData.get("email");
		const token = formData.get("token") || undefined;
		const validated = validateInput(unsubscribeFromNewsletterSchema, {
			email,
			token,
		});
		if ("error" in validated) return validated.error;

		const { email: validatedEmail, token: validatedToken } = validated.data;

		// Si un token est fourni, l'utiliser pour trouver l'abonné (plus sécurisé)
		let existingSubscriber;
		if (validatedToken) {
			existingSubscriber = await prisma.newsletterSubscriber.findFirst({
				where: {
					unsubscribeToken: validatedToken,
					deletedAt: null,
				},
			});

			// Vérifier que l'email correspond au token (sécurité)
			if (
				existingSubscriber &&
				existingSubscriber.email !== validatedEmail
			) {
				return error("Le code de désinscription ne correspond pas à cet email.");
			}
		} else {
			// Email-only fallback: less secure than token-based but necessary for users who
			// lost the original email or whose token link expired. Information disclosure is
			// mitigated by returning generic messages regardless of subscriber existence.
			existingSubscriber = await prisma.newsletterSubscriber.findFirst({
				where: {
					email: validatedEmail,
					deletedAt: null,
				},
			});
		}

		if (!existingSubscriber) {
			// Si token fourni → utilisateur a cliqué lien newsletter → message précis
			if (validatedToken) {
				return success("Votre désinscription a été confirmée. Merci d'avoir fait partie de notre communauté.");
			}

			// Sinon (email seul) → ne pas révéler si email existe (sécurité)
			return success("Si vous étiez inscrit(e), votre désinscription a été prise en compte.");
		}

		// Si l'abonné est déjà désabonné - message générique pour éviter information disclosure
		if (existingSubscriber.status === NewsletterStatus.UNSUBSCRIBED) {
			return success("Si vous étiez inscrit(e), votre désinscription a été prise en compte.");
		}

		// Désabonner (utiliser le token si disponible, sinon l'email)
		await prisma.newsletterSubscriber.update({
			where: validatedToken
				? { unsubscribeToken: validatedToken }
				: { email: validatedEmail },
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: new Date(),
			},
		});

		// Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Vous avez été désinscrit(e) de la newsletter. Nous sommes désolés de vous voir partir.");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue. Veuillez réessayer plus tard.");
	}
}
