"use server";

import { updateTag } from "next/cache";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	notFound,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_NEWSLETTER_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";
import { adminRestoreSubscriberSchema } from "../schemas/newsletter.schemas";

/**
 * Restaure un subscriber soft-deleted en remettant `deletedAt = null`.
 * Symétrique de `adminDeleteNewsletterSubscriber`.
 */
export async function adminRestoreSubscriber(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_NEWSLETTER_LIMITS.RESTORE);
	if ("error" in rateLimit) return rateLimit.error;

	const validation = validateInput(adminRestoreSubscriberSchema, {
		subscriberId: safeFormGet(formData, "subscriberId"),
	});
	if ("error" in validation) return validation.error;

	const { subscriberId } = validation.data;

	try {
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { id: subscriberId },
			select: { id: true, email: true, userId: true, deletedAt: true },
		});

		if (!subscriber) {
			return notFound("Abonné non trouvé");
		}

		if (!subscriber.deletedAt) {
			return error("Cet abonné n'est pas supprimé.");
		}

		await prisma.newsletterSubscriber.update({
			where: { id: subscriberId },
			data: { deletedAt: null },
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminRestore",
			targetType: "newsletter_subscriber",
			targetId: subscriberId,
			metadata: { email: subscriber.email },
		});

		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		if (subscriber.userId) {
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(subscriber.userId));
		}

		return success(`Abonné ${subscriber.email} restauré.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la restauration");
	}
}
