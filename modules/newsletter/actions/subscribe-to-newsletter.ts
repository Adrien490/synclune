"use server";

import { ajNewsletter } from "@/shared/lib/arcjet";
import { getBaseUrl } from "@/shared/constants/urls";
import { getClientIp } from "@/shared/lib/rate-limit";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { subscribeToNewsletterSchema } from "@/modules/newsletter/schemas/newsletter.schemas";
import { subscribeToNewsletterInternal } from "../services/subscribe-to-newsletter-internal";

export async function subscribeToNewsletter(
	_previousState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// Récupérer les informations de traçabilité RGPD
		const headersList = await headers();
		const ipAddress = (await getClientIp(headersList)) ?? "unknown";
		const userAgent = headersList.get("user-agent") ?? "unknown";

		// Protection Arcjet : Shield + Bot Detection + Rate Limiting
		const request = new Request(`${getBaseUrl()}/newsletter/subscribe`, {
			method: "POST",
			headers: headersList,
		});

		const decision = await ajNewsletter.protect(request, { requested: 1 });

		// Bloquer si Arcjet détecte une menace
		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return error("Trop de tentatives d'inscription. Veuillez réessayer dans quelques minutes.");
			}

			if (decision.reason.isBot()) {
				return error(
					"Votre requête semble provenir d'un bot. Veuillez réessayer depuis un navigateur normal.",
				);
			}

			if (decision.reason.isShield()) {
				return error("Votre requête a été bloquée pour des raisons de sécurité.");
			}

			return error("Votre requête n'a pas pu être traitée. Veuillez réessayer.");
		}

		// Validation avec Zod
		const email = formData.get("email");
		const consent = formData.get("consent") === "true";
		const validated = validateInput(subscribeToNewsletterSchema, { email, consent });
		if ("error" in validated) return validated.error;

		const { email: validatedEmail } = validated.data;

		// Déléguer à la fonction utilitaire interne (single source of truth)
		const internalResult = await subscribeToNewsletterInternal({
			email: validatedEmail,
			ipAddress,
			userAgent,
			consentSource: "newsletter_form",
		});

		if (!internalResult.success) {
			return error(internalResult.message);
		}

		// Return success for all cases (including alreadySubscribed) to prevent
		// email enumeration via response status. Internal already returns a
		// generic message that doesn't reveal subscription state.
		return success(internalResult.message);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue. Veuillez réessayer plus tard.");
	}
}
