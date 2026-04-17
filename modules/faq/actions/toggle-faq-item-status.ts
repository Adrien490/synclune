"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_FAQ_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getFaqInvalidationTags } from "../constants/cache";
import { toggleFaqItemStatusSchema } from "../schemas/faq.schemas";

export async function toggleFaqItemStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_FAQ_LIMITS.TOGGLE_STATUS);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(toggleFaqItemStatusSchema, {
			id: formData.get("id"),
			isActive: formData.get("isActive") === "true",
		});
		if ("error" in validated) return validated.error;

		const { id, isActive } = validated.data;

		const existing = await prisma.faqItem.findUnique({
			where: { id },
			select: { id: true, isActive: true, question: true },
		});

		if (!existing) {
			return error("Cette question FAQ n'existe pas");
		}

		if (existing.isActive === isActive) {
			return success(isActive ? "Question déjà active" : "Question déjà inactive");
		}

		await prisma.faqItem.update({
			where: { id },
			data: { isActive },
		});

		getFaqInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "faq.toggleStatus",
			targetType: "faq",
			targetId: id,
			metadata: { question: existing.question, isActive },
		});

		return success(
			isActive ? "Question FAQ activée avec succès" : "Question FAQ désactivée avec succès",
		);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut de la question FAQ");
	}
}
