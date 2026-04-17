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
import { bulkDeleteFaqItemsSchema } from "../schemas/faq.schemas";

export async function bulkDeleteFaqItems(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_FAQ_LIMITS.BULK_DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		const ids = formData.getAll("ids") as string[];

		const validated = validateInput(bulkDeleteFaqItemsSchema, { ids });
		if ("error" in validated) return validated.error;

		const existing = await prisma.faqItem.findMany({
			where: { id: { in: validated.data.ids } },
			select: { id: true, question: true },
		});

		if (existing.length === 0) {
			return error("Aucune question FAQ trouvée");
		}

		const deletableIds = existing.map((f) => f.id);

		// Hard delete: ephemeral content, no legal retention obligation
		await prisma.faqItem.deleteMany({
			where: { id: { in: deletableIds } },
		});

		getFaqInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "faq.bulkDelete",
			targetType: "faq",
			targetId: deletableIds.join(","),
			metadata: { count: deletableIds.length, questions: existing.map((f) => f.question) },
		});

		const skippedCount = validated.data.ids.length - deletableIds.length;
		const message =
			skippedCount > 0
				? `${deletableIds.length} question(s) supprimée(s), ${skippedCount} introuvable(s)`
				: `${deletableIds.length} question(s) supprimée(s)`;

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression des questions FAQ");
	}
}
