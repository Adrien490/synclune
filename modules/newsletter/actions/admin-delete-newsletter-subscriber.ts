"use server";

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

const adminDeleteSubscriberSchema = z.object({
	subscriberId: z.string().cuid2("ID invalide"),
});

/**
 * Suppression (soft delete RGPD) d'un abonné newsletter par un administrateur
 * Préserve l'enregistrement avec deletedAt pour conformité RGPD
 */
export async function adminDeleteNewsletterSubscriber(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// 1. Auth check
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	// 2. Rate limiting
	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_NEWSLETTER_LIMITS.DELETE);
	if ("error" in rateLimit) return rateLimit.error;

	// 3. Validation
	const validation = validateInput(adminDeleteSubscriberSchema, {
		subscriberId: safeFormGet(formData, "subscriberId"),
	});
	if ("error" in validation) return validation.error;

	const { subscriberId } = validation.data;

	try {
		// 4. Vérifier existence
		const subscriber = await prisma.newsletterSubscriber.findFirst({
			where: { id: subscriberId, ...notDeleted },
			select: { id: true, email: true, userId: true },
		});

		if (!subscriber) {
			return notFound("Abonné non trouvé");
		}

		// 5. Soft delete (RGPD : preserves deletedAt for audit/retention)
		await prisma.newsletterSubscriber.update({
			where: { id: subscriberId },
			data: { deletedAt: new Date() },
		});

		// 6. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminDelete",
			targetType: "newsletter_subscriber",
			targetId: subscriberId,
			metadata: { email: subscriber.email },
		});

		// 7. Invalidation cache
		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		if (subscriber.userId) {
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(subscriber.userId));
		}

		return success(`Abonné ${subscriber.email} supprimé.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}
