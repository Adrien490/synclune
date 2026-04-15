"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_NEWSLETTER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { z } from "zod";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";

const adminBulkDeleteSubscribersSchema = z.object({
	subscriberIds: z
		.array(z.string().cuid2("ID invalide"))
		.min(1, "Au moins un abonné est requis")
		.max(100, "Maximum 100 abonnés par opération"),
});

/**
 * Suppression en masse (soft delete RGPD) d'abonnés newsletter par un administrateur
 */
export async function adminBulkDeleteNewsletterSubscribers(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// 1. Auth check
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	// 2. Rate limiting
	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_NEWSLETTER_LIMITS.BULK_DELETE);
	if ("error" in rateLimit) return rateLimit.error;

	// 3. Validation
	const subscriberIds = formData.getAll("subscriberIds") as string[];
	const validation = validateInput(adminBulkDeleteSubscribersSchema, { subscriberIds });
	if ("error" in validation) return validation.error;

	const { subscriberIds: validatedIds } = validation.data;

	try {
		// 4. Récupérer les abonnés existants
		const existing = await prisma.newsletterSubscriber.findMany({
			where: { id: { in: validatedIds }, ...notDeleted },
			select: { id: true, email: true, userId: true },
		});

		if (existing.length === 0) {
			return error("Aucun abonné trouvé");
		}

		// 5. Soft delete en masse
		await prisma.newsletterSubscriber.updateMany({
			where: { id: { in: existing.map((s) => s.id) } },
			data: { deletedAt: new Date() },
		});

		// 6. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.adminBulkDelete",
			targetType: "newsletter_subscriber",
			targetId: existing.map((s) => s.id).join(","),
			metadata: { count: existing.length },
		});

		// 7. Invalidation cache
		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		const userIds = new Set(existing.map((s) => s.userId).filter(Boolean) as string[]);
		for (const uid of userIds) {
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(uid));
		}

		const count = existing.length;
		return success(`${count} abonné${count > 1 ? "s" : ""} supprimé${count > 1 ? "s" : ""}.`, {
			count,
		});
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression en masse");
	}
}
