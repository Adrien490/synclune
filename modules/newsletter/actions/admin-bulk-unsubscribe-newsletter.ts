"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_NEWSLETTER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";

/**
 * Désabonnement en masse d'abonnés par un administrateur
 */
export async function adminBulkUnsubscribeNewsletter(
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

	// 3. Parse IDs
	const subscriberIds = formData.getAll("subscriberIds").filter(Boolean).map(String);
	if (subscriberIds.length === 0) {
		return error("Aucun abonné sélectionné");
	}

	try {
		// 4. Mise à jour en masse
		const result = await prisma.newsletterSubscriber.updateMany({
			where: {
				id: { in: subscriberIds },
				status: { not: NewsletterStatus.UNSUBSCRIBED },
				...notDeleted,
			},
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: new Date(),
			},
		});

		// 5. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminBulkUnsubscribe",
			targetType: "newsletter_subscriber",
			targetId: subscriberIds.join(","),
			metadata: { count: result.count, requestedCount: subscriberIds.length },
		});

		// 6. Invalidation cache
		updateTag(NEWSLETTER_CACHE_TAGS.LIST);

		return success(`${result.count} abonné(s) désabonné(s) avec succès.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors du désabonnement en masse");
	}
}
