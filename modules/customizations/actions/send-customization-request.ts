"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/shared/lib/prisma";
import {
	sendCustomizationRequestEmail,
	sendCustomizationConfirmationEmail,
} from "@/modules/emails/services/customization-emails";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { CUSTOMIZATION_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeForEmail } from "@/shared/lib/sanitize";
import {
	validateInput,
	success,
	error,
	handleActionError,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { customizationSchema } from "../schemas/customization.schema";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";

/**
 * Server Action pour envoyer une demande de personnalisation
 * - Crée la demande en base de données
 * - Envoie un email de notification à l'admin
 *
 * Rate limiting configuré via CUSTOMIZATION_LIMITS.QUOTE_REQUEST
 */
export async function sendCustomizationRequest(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting (protection anti-spam)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);

		const rateLimitId = getRateLimitIdentifier(null, null, ipAddress);
		const rateLimit = await checkRateLimit(rateLimitId, CUSTOMIZATION_LIMITS.QUOTE_REQUEST);

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
			// Log pour monitoring (sans exposer au client, sans PII)
			console.warn("[SECURITY] Honeypot triggered", {
				ip: ipAddress,
				timestamp: new Date().toISOString(),
			});
			// On retourne un succès pour ne pas alerter le bot
			return success("Votre demande a bien été envoyée.");
		}

		// 5. Rate limiting par email (protection contre spam multi-IP)
		const emailRateLimitId = `customization:email:${validatedData.email.toLowerCase()}`;
		const emailRateLimit = await checkRateLimit(emailRateLimitId, {
			limit: 5,
			windowMs: 24 * 60 * 60 * 1000, // 5 demandes par email par 24h
		});

		if (!emailRateLimit.success) {
			return error("Trop de demandes pour cette adresse email. Réessaie demain.");
		}

		// 6. Retrieve optional session for userId linkage
		const session = await getSession();
		const userId = session?.user?.id ?? null;

		// 7. Trouver le productTypeId correspondant au label (optionnel)
		const productType = await prisma.productType.findFirst({
			where: {
				label: validatedData.productTypeLabel,
				isActive: true,
			},
			select: { id: true },
		});

		// 8. Créer la demande en base de données
		const customizationRequest = await prisma.customizationRequest.create({
			data: {
				firstName: validatedData.firstName,
				email: validatedData.email,
				phone: validatedData.phone || null,
				productTypeLabel: validatedData.productTypeLabel,
				productTypeId: productType?.id || null,
				details: validatedData.details,
				userId,
			},
		});

		// 9. Sanitize PII for email injection prevention (defense-in-depth)
		const sanitizedEmail = sanitizeForEmail(validatedData.email);
		const sanitizedFirstName = sanitizeForEmail(validatedData.firstName);
		const sanitizedDetails = sanitizeForEmail(validatedData.details);
		const sanitizedProductTypeLabel = sanitizeForEmail(validatedData.productTypeLabel);
		const sanitizedPhone = validatedData.phone ? sanitizeForEmail(validatedData.phone) : undefined;

		// 10. Envoyer l'email de notification à l'admin
		try {
			const emailResult = await sendCustomizationRequestEmail({
				firstName: sanitizedFirstName,
				email: sanitizedEmail,
				phone: sanitizedPhone,
				productTypeLabel: sanitizedProductTypeLabel,
				details: sanitizedDetails,
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

		// 11. Envoyer l'email de confirmation au client
		try {
			await sendCustomizationConfirmationEmail({
				firstName: sanitizedFirstName,
				email: sanitizedEmail,
				productTypeLabel: sanitizedProductTypeLabel,
				details: sanitizedDetails,
			});
		} catch {
			// Silence - email confirmation non critique
		}

		// 12. Invalider le cache admin + user cache if logged in
		const tags = getCustomizationInvalidationTags();
		if (userId) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(userId));
		}
		tags.forEach((tag) => updateTag(tag));

		// 13. Success
		return success(
			"Votre demande de personnalisation a bien été envoyée. Nous vous répondrons dans les plus brefs délais.",
			{ id: customizationRequest.id }
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'envoi de votre demande.");
	}
}
