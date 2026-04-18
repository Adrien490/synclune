"use server";

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

		// Validation avec Zod
		const email = formData.get("email");
		const consent = formData.get("consent") === "true";
		const validated = validateInput(subscribeToNewsletterSchema, { email, consent });
		if ("error" in validated) return validated.error;

		const { email: validatedEmail } = validated.data;

		const internalResult = await subscribeToNewsletterInternal({
			email: validatedEmail,
			ipAddress,
			userAgent,
			consentSource: "newsletter_form",
		});

		if (!internalResult.success) {
			return error(internalResult.message);
		}

		return success(internalResult.message);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue. Veuillez réessayer plus tard.");
	}
}
