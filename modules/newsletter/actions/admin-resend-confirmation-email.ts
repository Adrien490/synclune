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
import { adminResendConfirmationSchema } from "../schemas/newsletter.schemas";

const RESEND_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Renvoie l'email de confirmation a un subscriber PENDING.
 * Garde-fous : statut PENDING uniquement, cooldown d'1h depuis le dernier envoi.
 */
export async function adminResendConfirmationEmail(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	const rateLimit = await enforceRateLimitForCurrentUser(
		ADMIN_NEWSLETTER_LIMITS.RESEND_CONFIRMATION,
	);
	if ("error" in rateLimit) return rateLimit.error;

	const validation = validateInput(adminResendConfirmationSchema, {
		subscriberId: safeFormGet(formData, "subscriberId"),
	});
	if ("error" in validation) return validation.error;

	const { subscriberId } = validation.data;

	try {
		const subscriber = await prisma.newsletterSubscriber.findFirst({
			where: { id: subscriberId, ...notDeleted },
			select: {
				id: true,
				email: true,
				status: true,
				userId: true,
				confirmationSentAt: true,
			},
		});

		if (!subscriber) {
			return notFound("Abonné non trouvé");
		}

		if (subscriber.status !== NewsletterStatus.PENDING) {
			return error(
				"Seuls les abonnés en attente peuvent recevoir un nouvel email de confirmation.",
			);
		}

		if (
			subscriber.confirmationSentAt &&
			Date.now() - subscriber.confirmationSentAt.getTime() < RESEND_COOLDOWN_MS
		) {
			return error("Un email a déjà été envoyé récemment. Réessayez dans 1 heure.");
		}

		const confirmationToken = randomUUID();

		await prisma.newsletterSubscriber.update({
			where: { id: subscriberId },
			data: {
				confirmationToken,
				confirmationSentAt: new Date(),
			},
		});

		const confirmationUrl = `${NEWSLETTER_BASE_URL}${ROUTES.NEWSLETTER.CONFIRM}?token=${confirmationToken}`;
		const emailResult = await sendNewsletterConfirmationEmail({
			to: subscriber.email,
			confirmationUrl,
		});

		if (!emailResult.success) {
			logger.error("Failed to resend newsletter confirmation email", emailResult.error, {
				service: "admin-resend-confirmation-email",
				subscriberId,
			});
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminResendConfirmation",
			targetType: "newsletter_subscriber",
			targetId: subscriberId,
			metadata: { email: subscriber.email, emailSent: emailResult.success },
		});

		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		if (subscriber.userId) {
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(subscriber.userId));
		}

		return success(`Email de confirmation renvoyé à ${subscriber.email}.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors du renvoi de l'email de confirmation");
	}
}
