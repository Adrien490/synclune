"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";

import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import {
	sendCustomizationRequestEmail,
	sendCustomizationConfirmationEmail,
} from "@/modules/emails/services/customization-emails";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { CUSTOMIZATION_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeForEmail } from "@/shared/lib/sanitize";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import {
	validateInput,
	success,
	error,
	handleActionError,
	safeFormGet,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { customizationSchema } from "../schemas/customization.schema";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import {
	CUSTOMIZATION_ERROR_MESSAGES,
	CUSTOMIZATION_SUCCESS_MESSAGES,
} from "../constants/error-messages";

/**
 * Server Action pour envoyer une demande de personnalisation
 * - Crée la demande en base de données
 * - Envoie un email de notification à l'admin
 *
 * Rate limiting configuré via CUSTOMIZATION_LIMITS.QUOTE_REQUEST
 */
export async function sendCustomizationRequest(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting (protection anti-spam)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);

		const rateLimitId = getRateLimitIdentifier(null, null, ipAddress);
		const rateLimit = await checkRateLimit(rateLimitId, CUSTOMIZATION_LIMITS.QUOTE_REQUEST);

		if (!rateLimit.success) {
			return error(rateLimit.error ?? "Trop de demandes envoyées. Veuillez réessayer plus tard.");
		}

		// 2. Extraction des données du FormData
		const rawData = {
			firstName: safeFormGet(formData, "firstName"),
			email: safeFormGet(formData, "email"),
			phone: safeFormGet(formData, "phone") ?? "",
			productTypeLabel: safeFormGet(formData, "productTypeLabel") ?? "",
			details: safeFormGet(formData, "details") ?? "",
			inspirationMedias:
				safeFormGetJSON<{ url: string; blurDataUrl?: string; altText?: string }[]>(
					formData,
					"inspirationMedias",
				) ?? [],
			website: safeFormGet(formData, "website") ?? "",
		};

		// Parse deleted image URLs for UploadThing cleanup (outside Zod schema)
		const rawDeletedImageUrls = safeFormGetJSON<unknown[]>(formData, "deletedImageUrls") ?? [];
		const deletedImageUrls = rawDeletedImageUrls.filter(
			(url): url is string => typeof url === "string" && url.length > 0 && url.length <= 2048,
		);

		// 3. Validation avec Zod
		const validation = validateInput(customizationSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Vérification honeypot (anti-spam)
		if (validatedData.website && validatedData.website.trim() !== "") {
			// Log pour monitoring (sans exposer au client, sans PII)
			logger.warn("Honeypot triggered", { action: "sendCustomizationRequest" });
			// On retourne un succès pour ne pas alerter le bot
			return success("Votre demande a bien été envoyée.");
		}

		// 5. Rate limiting par email (protection contre spam multi-IP)
		const emailRateLimitId = `customization:email:${validatedData.email.toLowerCase()}`;
		const emailRateLimit = await checkRateLimit(
			emailRateLimitId,
			{
				limit: 5,
				windowMs: 24 * 60 * 60 * 1000, // 5 demandes par email par 24h
			},
			ipAddress,
		);

		if (!emailRateLimit.success) {
			return error(CUSTOMIZATION_ERROR_MESSAGES.EMAIL_RATE_LIMITED);
		}

		// 6. Retrieve optional session for userId linkage
		const session = await getSession();
		const userId = session?.user.id ?? null;

		// 7. Trouver le productTypeId correspondant au label (optionnel)
		const productType = await prisma.productType.findFirst({
			where: {
				label: validatedData.productTypeLabel,
				isActive: true,
			},
			select: { id: true },
		});

		// 8. Créer la demande en base de données (avec médias dans une transaction)
		const customizationRequest = await prisma.$transaction(async (tx) => {
			const request = await tx.customizationRequest.create({
				data: {
					firstName: validatedData.firstName,
					email: validatedData.email,
					phone: validatedData.phone || null,
					productTypeLabel: validatedData.productTypeLabel,
					productTypeId: productType?.id ?? null,
					details: validatedData.details,
					consentGivenAt: new Date(),
					userId,
				},
			});

			if (validatedData.inspirationMedias.length > 0) {
				await tx.customizationMedia.createMany({
					data: validatedData.inspirationMedias.map((media, index) => ({
						customizationRequestId: request.id,
						url: media.url,
						blurDataUrl: media.blurDataUrl ?? null,
						altText: media.altText ? sanitizeForEmail(media.altText) : null,
						position: index,
					})),
				});
			}

			return request;
		});

		// 9. Delete removed images from UploadThing (non-blocking, cron acts as safety net)
		if (deletedImageUrls.length > 0) {
			deleteUploadThingFilesFromUrls(deletedImageUrls).catch((e) => {
				logger.error("Failed to delete UploadThing files", e, {
					action: "sendCustomizationRequest",
				});
			});
		}

		// 10. Sanitize PII for email injection prevention (defense-in-depth)
		const sanitizedEmail = sanitizeForEmail(validatedData.email);
		const sanitizedFirstName = sanitizeForEmail(validatedData.firstName);
		const sanitizedDetails = sanitizeForEmail(validatedData.details);
		const sanitizedProductTypeLabel = sanitizeForEmail(validatedData.productTypeLabel);
		const sanitizedPhone = validatedData.phone ? sanitizeForEmail(validatedData.phone) : undefined;

		// 11. Envoyer l'email de notification à l'admin
		try {
			const emailResult = await sendCustomizationRequestEmail({
				firstName: sanitizedFirstName,
				email: sanitizedEmail,
				phone: sanitizedPhone,
				productTypeLabel: sanitizedProductTypeLabel,
				details: sanitizedDetails,
				inspirationMedias: validatedData.inspirationMedias.map((media) => ({
					url: media.url,
					altText: media.altText ? sanitizeForEmail(media.altText) : undefined,
				})),
			});

			if (!emailResult.success) {
				logger.error("Admin notification failed", emailResult.error, {
					action: "sendCustomizationRequest",
				});
			}
		} catch (emailError) {
			logger.error("Admin notification exception", emailError, {
				action: "sendCustomizationRequest",
			});
		}

		// 12. Envoyer l'email de confirmation au client
		try {
			await sendCustomizationConfirmationEmail({
				firstName: sanitizedFirstName,
				email: sanitizedEmail,
				productTypeLabel: sanitizedProductTypeLabel,
				details: sanitizedDetails,
				inspirationMedias:
					validatedData.inspirationMedias.length > 0
						? validatedData.inspirationMedias.map((media) => ({
								url: media.url,
								altText: media.altText ? sanitizeForEmail(media.altText) : undefined,
							}))
						: undefined,
			});
		} catch {
			// Silence - email confirmation non critique
		}

		// 13. Invalider le cache admin + user cache if logged in
		const tags = getCustomizationInvalidationTags();
		if (userId) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(userId));
		}
		tags.forEach((tag) => updateTag(tag));

		// 14. Success
		return success(CUSTOMIZATION_SUCCESS_MESSAGES.REQUEST_SENT, {
			id: customizationRequest.id,
		});
	} catch (e) {
		Sentry.captureException(e);
		return handleActionError(e, CUSTOMIZATION_ERROR_MESSAGES.CREATE_ERROR);
	}
}
