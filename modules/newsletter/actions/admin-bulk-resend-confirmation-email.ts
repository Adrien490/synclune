"use server";

import { randomUUID } from "crypto";
import { updateTag } from "next/cache";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { sendNewsletterConfirmationEmail } from "@/modules/emails/services/newsletter-emails";
import { error, handleActionError, success, validateInput } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { logger } from "@/shared/lib/logger";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { ADMIN_NEWSLETTER_LIMITS } from "@/shared/lib/rate-limit-config";
import { ROUTES } from "@/shared/constants/urls";
import type { ActionState } from "@/shared/types/server-action";

import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";
import { NEWSLETTER_BASE_URL } from "../constants/urls.constants";
import { adminBulkResendConfirmationSchema } from "../schemas/newsletter.schemas";

const RESEND_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Renvoi en masse d'emails de confirmation pour subscribers PENDING.
 * Filtre uniquement PENDING + cooldown 1h. Promise.allSettled pour
 * tolérance aux échecs Resend partiels.
 */
export async function adminBulkResendConfirmationEmail(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_NEWSLETTER_LIMITS.BULK_RESEND);
	if ("error" in rateLimit) return rateLimit.error;

	const subscriberIds = formData.getAll("subscriberIds") as string[];
	const validation = validateInput(adminBulkResendConfirmationSchema, { subscriberIds });
	if ("error" in validation) return validation.error;

	const { subscriberIds: validatedIds } = validation.data;

	try {
		const cutoff = new Date(Date.now() - RESEND_COOLDOWN_MS);

		const eligible = await prisma.newsletterSubscriber.findMany({
			where: {
				id: { in: validatedIds },
				status: NewsletterStatus.PENDING,
				...notDeleted,
				OR: [{ confirmationSentAt: null }, { confirmationSentAt: { lt: cutoff } }],
			},
			select: { id: true, email: true, userId: true },
		});

		const skipped = validatedIds.length - eligible.length;

		if (eligible.length === 0) {
			return error("Aucun abonné éligible pour le renvoi (statut non-PENDING ou cooldown actif).");
		}

		const updates = eligible.map((subscriber) => {
			const confirmationToken = randomUUID();
			const confirmationUrl = `${NEWSLETTER_BASE_URL}${ROUTES.NEWSLETTER.CONFIRM}?token=${confirmationToken}`;
			return { subscriber, confirmationToken, confirmationUrl };
		});

		// Update tokens en transaction (atomicité)
		await prisma.$transaction(
			updates.map(({ subscriber, confirmationToken }) =>
				prisma.newsletterSubscriber.update({
					where: { id: subscriber.id },
					data: {
						confirmationToken,
						confirmationSentAt: new Date(),
					},
				}),
			),
		);

		const results = await Promise.allSettled(
			updates.map(({ subscriber, confirmationUrl }) =>
				sendNewsletterConfirmationEmail({
					to: subscriber.email,
					confirmationUrl,
				}),
			),
		);

		let sent = 0;
		let failed = 0;
		results.forEach((result, idx) => {
			if (result.status === "fulfilled" && result.value.success) {
				sent += 1;
			} else {
				failed += 1;
				const errPayload: unknown =
					result.status === "rejected"
						? result.reason
						: result.value.success
							? null
							: result.value.error;
				logger.error("Failed to send bulk confirmation email", errPayload, {
					service: "admin-bulk-resend-confirmation-email",
					subscriberId: updates[idx]?.subscriber.id,
				});
			}
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminBulkResend",
			targetType: "newsletter_subscriber",
			targetId: eligible.map((s) => s.id).join(","),
			metadata: {
				requestedCount: validatedIds.length,
				eligibleCount: eligible.length,
				sent,
				failed,
				skipped,
			},
		});

		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		const userIds = new Set(eligible.map((s) => s.userId).filter(Boolean) as string[]);
		for (const uid of userIds) {
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(uid));
		}

		return success(
			`Email de confirmation renvoyé à ${sent} abonné${sent > 1 ? "s" : ""}.${
				skipped > 0 ? ` ${skipped} ignoré${skipped > 1 ? "s" : ""} (non éligibles).` : ""
			}${failed > 0 ? ` ${failed} échec${failed > 1 ? "s" : ""} d'envoi.` : ""}`,
			{ sent, failed, skipped, eligibleCount: eligible.length },
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors du renvoi en masse");
	}
}
