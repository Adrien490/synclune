"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_NEWSLETTER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { z } from "zod";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";

const adminUnsubscribeSchema = z.object({
	subscriberId: z.string().cuid2("ID invalide"),
});

/**
 * Désabonnement forcé d'un subscriber par un administrateur
 * Passe le statut de PENDING ou CONFIRMED à UNSUBSCRIBED
 */
export async function adminUnsubscribeNewsletter(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// 1. Auth check
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	// 2. Rate limiting
	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_NEWSLETTER_LIMITS.UNSUBSCRIBE);
	if ("error" in rateLimit) return rateLimit.error;

	// 3. Validation
	const validation = validateInput(adminUnsubscribeSchema, {
		subscriberId: safeFormGet(formData, "subscriberId"),
	});
	if ("error" in validation) return validation.error;

	const { subscriberId } = validation.data;

	try {
		// 4. Vérifier existence
		const subscriber = await prisma.newsletterSubscriber.findFirst({
			where: { id: subscriberId, ...notDeleted },
			select: { id: true, email: true, status: true, userId: true },
		});

		if (!subscriber) {
			return notFound("Abonné non trouvé");
		}

		if (subscriber.status === NewsletterStatus.UNSUBSCRIBED) {
			return success("Cet abonné est déjà désabonné.");
		}

		// 5. Mise à jour statut
		await prisma.newsletterSubscriber.update({
			where: { id: subscriberId },
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: new Date(),
			},
		});

		// 6. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminUnsubscribe",
			targetType: "newsletter_subscriber",
			targetId: subscriberId,
			metadata: { email: subscriber.email, previousStatus: subscriber.status },
		});

		// 7. Invalidation cache
		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		if (subscriber.userId) {
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(subscriber.userId));
		}

		return success(`${subscriber.email} a été désabonné(e) de la newsletter.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors du désabonnement");
	}
}
