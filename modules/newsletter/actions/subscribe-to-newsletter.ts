"use server";

import { ajNewsletter } from "@/shared/lib/arcjet";
import { getClientIp } from "@/shared/lib/rate-limit";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { subscribeToNewsletterSchema } from "@/modules/newsletter/schemas/newsletter.schemas";
import { subscribeToNewsletterInternal } from "./subscribe-to-newsletter-internal";
import { getNewsletterInvalidationTags } from "../constants/cache";

export async function subscribeToNewsletter(
	_previousState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// Récupérer les informations de traçabilité RGPD
		const headersList = await headers();
		const ipAddress = (await getClientIp(headersList)) || "unknown";
		const userAgent = headersList.get("user-agent") || "unknown";

		// Protection Arcjet : Shield + Bot Detection + Rate Limiting
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
						"Trop de tentatives d'inscription. Veuillez réessayer dans quelques minutes.",
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

		// Déléguer à la fonction utilitaire interne (single source of truth)
		const internalResult = await subscribeToNewsletterInternal({
			email: validatedEmail,
			ipAddress,
			userAgent,
			consentSource: "newsletter_form",
		});

		if (!internalResult.success) {
			return {
				status: ActionStatus.ERROR,
				message: internalResult.message,
			};
		}

		if (internalResult.alreadySubscribed) {
			return {
				status: ActionStatus.CONFLICT,
				message: internalResult.message,
			};
		}

		// Invalider le cache (nouvelle inscription)
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: internalResult.message,
		};
	} catch (error) {
		console.error("[SUBSCRIBE_NEWSLETTER]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}
