"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_NEWSLETTER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";
import { adminBulkUnsubscribeSchema } from "../schemas/newsletter.schemas";

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

	// 3. Validation Zod stricte (CUID2 + max 100)
	const subscriberIds = formData.getAll("subscriberIds") as string[];
	const validation = validateInput(adminBulkUnsubscribeSchema, { subscriberIds });
	if ("error" in validation) return validation.error;

	const { subscriberIds: validatedIds } = validation.data;

	try {
		// 4. Récupérer les abonnés existants pour invalider le cache per-user
		const existing = await prisma.newsletterSubscriber.findMany({
			where: {
				id: { in: validatedIds },
				status: { not: NewsletterStatus.UNSUBSCRIBED },
				...notDeleted,
			},
			select: { id: true, userId: true },
		});

		if (existing.length === 0) {
			return error("Aucun abonné actif trouvé à désabonner");
		}

		// 5. Mise à jour en masse
		const result = await prisma.newsletterSubscriber.updateMany({
			where: { id: { in: existing.map((s) => s.id) } },
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: new Date(),
			},
		});

		// 6. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminBulkUnsubscribe",
			targetType: "newsletter_subscriber",
			targetId: existing.map((s) => s.id).join(","),
			metadata: { count: result.count, requestedCount: validatedIds.length },
		});

		// 7. Invalidation cache (LIST + per-user)
		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		const userIds = new Set(existing.map((s) => s.userId).filter(Boolean) as string[]);
		for (const uid of userIds) {
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(uid));
		}

		const count = result.count;
		return success(`${count} abonné${count > 1 ? "s" : ""} désabonné${count > 1 ? "s" : ""}.`, {
			count,
		});
	} catch (e) {
		return handleActionError(e, "Erreur lors du désabonnement en masse");
	}
}
