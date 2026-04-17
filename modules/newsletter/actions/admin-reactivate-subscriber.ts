"use server";

import { randomUUID } from "crypto";
import { updateTag } from "next/cache";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { sendNewsletterConfirmationEmail } from "@/modules/emails/services/newsletter-emails";
import {
	error,
	handleActionError,
	notFound,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { logger } from "@/shared/lib/logger";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { ADMIN_NEWSLETTER_LIMITS } from "@/shared/lib/rate-limit-config";
import { ROUTES } from "@/shared/constants/urls";
import type { ActionState } from "@/shared/types/server-action";

import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";
import { NEWSLETTER_BASE_URL } from "../constants/urls.constants";
import { adminReactivateSubscriberSchema } from "../schemas/newsletter.schemas";

/**
 * Réactive un subscriber UNSUBSCRIBED en le repassant en PENDING avec
 * un nouveau token de confirmation et un email de re-consent.
 *
 * RGPD : interdit de remettre directement en CONFIRMED, le re-consentement
 * explicite est obligatoire après une désinscription.
 */
export async function adminReactivateSubscriber(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_NEWSLETTER_LIMITS.REACTIVATE);
	if ("error" in rateLimit) return rateLimit.error;

	const validation = validateInput(adminReactivateSubscriberSchema, {
		subscriberId: safeFormGet(formData, "subscriberId"),
	});
	if ("error" in validation) return validation.error;

	const { subscriberId } = validation.data;

	try {
		const subscriber = await prisma.newsletterSubscriber.findFirst({
			where: { id: subscriberId, ...notDeleted },
			select: { id: true, email: true, status: true, userId: true },
		});

		if (!subscriber) {
			return notFound("Abonné non trouvé");
		}

		if (subscriber.status === NewsletterStatus.CONFIRMED) {
			return error("Cet abonné est déjà actif (CONFIRMED).");
		}

		if (subscriber.status === NewsletterStatus.PENDING) {
			return error(
				"Cet abonné est déjà en attente de confirmation. Utilisez le renvoi d'email à la place.",
			);
		}

		const confirmationToken = randomUUID();
		const newUnsubscribeToken = randomUUID();

		await prisma.newsletterSubscriber.update({
			where: { id: subscriberId },
			data: {
				status: NewsletterStatus.PENDING,
				confirmationToken,
				confirmationSentAt: new Date(),
				unsubscribeToken: newUnsubscribeToken,
				unsubscribedAt: null,
			},
		});

		const confirmationUrl = `${NEWSLETTER_BASE_URL}${ROUTES.NEWSLETTER.CONFIRM}?token=${confirmationToken}`;
		const emailResult = await sendNewsletterConfirmationEmail({
			to: subscriber.email,
			confirmationUrl,
		});

		if (!emailResult.success) {
			logger.error("Failed to send reactivation email", emailResult.error, {
				service: "admin-reactivate-subscriber",
				subscriberId,
			});
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminReactivate",
			targetType: "newsletter_subscriber",
			targetId: subscriberId,
			metadata: {
				email: subscriber.email,
				previousStatus: subscriber.status,
				emailSent: emailResult.success,
			},
		});

		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		if (subscriber.userId) {
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(subscriber.userId));
		}

		return success(
			`${subscriber.email} a reçu un email de confirmation pour réactiver son abonnement.`,
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la réactivation");
	}
}
