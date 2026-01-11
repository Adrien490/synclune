"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/shared/lib/prisma";
import {
	sendCustomizationRequestEmail,
	sendCustomizationConfirmationEmail,
} from "@/modules/emails/services/customization-emails";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { COMMUNICATION_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	success,
	error,
	handleActionError,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
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
			return error(
				rateLimit.error || "Trop de demandes envoyées. Veuillez réessayer plus tard."
			);
		}

		// 2. Extraction des données du FormData
		const rawData = {
			firstName: formData.get("firstName") as string,
			email: formData.get("email") as string,
			phone: (formData.get("phone") as string) || "",
			productTypeLabel: (formData.get("productTypeLabel") as string) || "",
			details: (formData.get("details") as string) || "",
			rgpdConsent: formData.get("rgpdConsent") === "true",
			website: (formData.get("website") as string) || "",
		};

		// 3. Validation avec Zod
		const validation = validateInput(customizationSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Vérification honeypot (anti-spam)
		if (validatedData.website && validatedData.website.trim() !== "") {
			// Log pour monitoring (sans exposer au client)
			console.warn("[SECURITY] Honeypot triggered", {
				ip: ipAddress,
				email: validatedData.email,
				timestamp: new Date().toISOString(),
			});
			// On retourne un succès pour ne pas alerter le bot
			return success("Votre demande a bien été envoyée.");
		}

		// 5. Rate limiting par email (protection contre spam multi-IP)
		const emailRateLimitId = `customization:email:${validatedData.email.toLowerCase()}`;
		const emailRateLimit = checkRateLimit(emailRateLimitId, {
			limit: 5,
			windowMs: 24 * 60 * 60 * 1000, // 5 demandes par email par 24h
		});

		if (!emailRateLimit.success) {
			return error("Trop de demandes pour cette adresse email. Réessaie demain.");
		}

		// 6. Trouver le productTypeId correspondant au label (optionnel)
		const productType = await prisma.productType.findFirst({
			where: {
				label: validatedData.productTypeLabel,
				isActive: true,
			},
			select: { id: true },
		});

		// 7. Créer la demande en base de données
		const customizationRequest = await prisma.customizationRequest.create({
			data: {
				firstName: validatedData.firstName,
				email: validatedData.email,
				phone: validatedData.phone || null,
				productTypeLabel: validatedData.productTypeLabel,
				productTypeId: productType?.id || null,
				details: validatedData.details,
			},
		});

		// 8. Sanitize email pour éviter l'injection de headers SMTP
		const sanitizedEmail = validatedData.email.replace(/[\r\n]/g, "");

		// 9. Envoyer l'email de notification à l'admin
		try {
			const emailResult = await sendCustomizationRequestEmail({
				firstName: validatedData.firstName,
				email: sanitizedEmail,
				phone: validatedData.phone || undefined,
				productTypeLabel: validatedData.productTypeLabel,
				details: validatedData.details,
			});

			if (!emailResult.success) {
				console.error("[EMAIL] Admin notification failed", {
					requestId: customizationRequest.id,
					error: emailResult.error,
				});
			}
		} catch (emailError) {
			console.error("[EMAIL] Admin notification exception", {
				requestId: customizationRequest.id,
				error: emailError,
			});
		}

		// 10. Envoyer l'email de confirmation au client
		try {
			await sendCustomizationConfirmationEmail({
				firstName: validatedData.firstName,
				email: sanitizedEmail,
				productTypeLabel: validatedData.productTypeLabel,
				details: validatedData.details,
			});
		} catch {
			// Silence - email confirmation non critique
		}

		// 11. Invalider le cache admin
		const tags = getCustomizationInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		// 12. Success
		return success(
			"Votre demande de personnalisation a bien été envoyée. Nous vous répondrons dans les plus brefs délais.",
			{ id: customizationRequest.id }
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'envoi de votre demande.");
	}
}
