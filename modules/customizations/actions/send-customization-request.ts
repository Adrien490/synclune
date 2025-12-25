"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/shared/lib/prisma";
import {
	sendCustomizationRequestEmail,
	sendCustomizationConfirmationEmail,
} from "@/shared/lib/email";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { COMMUNICATION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

import { customizationSchema } from "../schemas/customization.schema";
import { getCustomizationInvalidationTags } from "../constants/cache";

/**
 * Server Action pour envoyer une demande de personnalisation
 * - Crée la demande en base de données
 * - Envoie un email de notification à l'admin
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
			productTypeLabel: (formData.get("productTypeLabel") as string) || "",
			details: (formData.get("details") as string) || "",
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

		// 5. Trouver le productTypeId correspondant au label (optionnel)
		const productType = await prisma.productType.findFirst({
			where: { label: validatedData.productTypeLabel },
			select: { id: true },
		});

		// 6. Créer la demande en base de données
		const customizationRequest = await prisma.customizationRequest.create({
			data: {
				firstName: validatedData.firstName,
				lastName: validatedData.lastName,
				email: validatedData.email,
				phone: validatedData.phone || null,
				productTypeLabel: validatedData.productTypeLabel,
				productTypeId: productType?.id || null,
				details: validatedData.details,
			},
		});

		// 7. Envoyer l'email de notification à l'admin
		const emailResult = await sendCustomizationRequestEmail({
			firstName: validatedData.firstName,
			lastName: validatedData.lastName,
			email: validatedData.email,
			phone: validatedData.phone || undefined,
			productTypeLabel: validatedData.productTypeLabel,
			details: validatedData.details,
		});

		if (!emailResult.success) {
			// La demande est enregistrée, mais l'email n'a pas été envoyé
			// On log l'erreur mais on ne fait pas échouer la requête
			console.error(
				`[CustomizationRequest] Email admin non envoyé pour la demande ${customizationRequest.id}:`,
				emailResult.error
			);
		}

		// 8. Envoyer l'email de confirmation au client
		const confirmationResult = await sendCustomizationConfirmationEmail({
			firstName: validatedData.firstName,
			email: validatedData.email,
			productTypeLabel: validatedData.productTypeLabel,
			details: validatedData.details,
		});

		if (!confirmationResult.success) {
			console.error(
				`[CustomizationRequest] Email confirmation non envoyé pour la demande ${customizationRequest.id}:`,
				confirmationResult.error
			);
		}

		// 9. Invalider le cache admin
		const tags = getCustomizationInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		// 10. Success
		return {
			status: ActionStatus.SUCCESS,
			message:
				"Votre demande de personnalisation a bien été envoyée. Nous vous répondrons dans les plus brefs délais.",
			data: { id: customizationRequest.id },
		};
	} catch (e) {
		console.error("[CustomizationRequest] Erreur:", e);
		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.",
		};
	}
}
