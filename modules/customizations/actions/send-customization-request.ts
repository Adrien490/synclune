"use server";

import { sendCustomizationRequestEmail } from "@/shared/lib/email";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { COMMUNICATION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { customizationSchema } from "../schemas/customization.schema";

/**
 * Server Action pour envoyer une demande de personnalisation
 * Compatible avec useActionState de React 19
 *
 * Rate limiting configuré via COMMUNICATION_LIMITS.CONTACT
 */
export async function sendCustomizationRequest(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting (protection anti-spam contact)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);

		const rateLimitId = getRateLimitIdentifier(null, null, ipAddress);
		const rateLimit = checkRateLimit(rateLimitId, COMMUNICATION_LIMITS.CONTACT);

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message: rateLimit.error || "Trop de demandes envoyées. Veuillez réessayer plus tard.",
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			};
		}

		// 2. Extraction des données du FormData
		const rawData = {
			firstName: formData.get("firstName") as string,
			lastName: formData.get("lastName") as string,
			email: formData.get("email") as string,
			phone: (formData.get("phone") as string) || "",
			jewelryType: (formData.get("jewelryType") as string) || "",
			customizationDetails: (formData.get("customizationDetails") as string) || "",
			rgpdConsent: formData.get("rgpdConsent") === "true",
			website: (formData.get("website") as string) || "",
		};

		// 3. Validation avec Zod
		const result = customizationSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			const errorPath = firstError.path.join(".");
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: `${errorPath}: ${firstError.message}`,
			};
		}

		const validatedData = result.data;

		// 4. Vérification honeypot (anti-spam)
		if (validatedData.website && validatedData.website.trim() !== "") {
			// On retourne un succès pour ne pas alerter le bot
			return {
				status: ActionStatus.SUCCESS,
				message: "Votre demande a bien été envoyée.",
			};
		}

		// 5. Envoyer l'email de demande de personnalisation à l'admin
		const emailResult = await sendCustomizationRequestEmail({
			firstName: validatedData.firstName,
			lastName: validatedData.lastName,
			email: validatedData.email,
			phone: validatedData.phone || undefined,
			jewelryType: validatedData.jewelryType,
			customizationDetails: validatedData.customizationDetails,
		});

		if (!emailResult.success) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer ou nous contacter directement.",
			};
		}

		// 6. Success
		return {
			status: ActionStatus.SUCCESS,
			message: "Votre demande de personnalisation a bien été envoyée. Nous vous répondrons dans les plus brefs délais.",
		};
	} catch (e) {
		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.",
		};
	}
}
