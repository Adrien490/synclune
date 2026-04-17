"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, safeFormGetJSON } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_FAQ_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getFaqInvalidationTags } from "../constants/cache";
import { bulkToggleFaqItemStatusSchema } from "../schemas/faq.schemas";

export async function bulkToggleFaqItemStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_FAQ_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const ids: unknown = safeFormGetJSON<unknown>(formData, "ids") ?? [];
		const isActive = formData.get("isActive") === "true";

		const validated = validateInput(bulkToggleFaqItemStatusSchema, { ids, isActive });
		if ("error" in validated) return validated.error;
		const { ids: validIds, isActive: validIsActive } = validated.data;

		const result = await prisma.faqItem.updateMany({
			where: { id: { in: validIds } },
			data: { isActive: validIsActive },
		});

		getFaqInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "faq.bulkToggleStatus",
			targetType: "faq",
			targetId: validIds.join(","),
			metadata: { count: result.count, isActive: validIsActive },
		});

		const statusText = validIsActive ? "activée" : "désactivée";
		const plural = result.count > 1 ? "s" : "";
		return success(`${result.count} question${plural} ${statusText}${plural} avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des questions FAQ");
	}
}
