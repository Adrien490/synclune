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
import { deleteFaqItemSchema } from "../schemas/faq.schemas";

export async function deleteFaqItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_FAQ_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(deleteFaqItemSchema, {
			id: formData.get("id"),
		});
		if ("error" in validated) return validated.error;

		const existing = await prisma.faqItem.findUnique({
			where: { id: validated.data.id },
		});

		if (!existing) {
			return error("Cette question FAQ n'existe pas");
		}

		// Hard delete: ephemeral content, no legal retention obligation
		await prisma.faqItem.delete({
			where: { id: validated.data.id },
		});

		getFaqInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "faq.delete",
			targetType: "faq",
			targetId: validated.data.id,
			metadata: { question: existing.question },
		});

		return success("Question FAQ supprimée avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de la question FAQ");
	}
}
