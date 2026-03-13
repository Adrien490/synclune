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
import { reorderFaqItemsSchema } from "../schemas/faq.schemas";

export async function reorderFaqItems(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_FAQ_LIMITS.REORDER);
		if ("error" in rateLimit) return rateLimit.error;

		const rawItems = formData.get("items") as string | null;
		let parsedItems: { id: string; position: number }[] = [];
		if (rawItems) {
			try {
				parsedItems = JSON.parse(rawItems) as { id: string; position: number }[];
			} catch {
				return error("Données de réordonnancement invalides");
			}
		}

		const validated = validateInput(reorderFaqItemsSchema, {
			items: parsedItems,
		});
		if ("error" in validated) return validated.error;

		const { items } = validated.data;

		// Batch update positions in a transaction
		await prisma.$transaction(
			items.map((item) =>
				prisma.faqItem.update({
					where: { id: item.id },
					data: { position: item.position },
				}),
			),
		);

		getFaqInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "faq.reorder",
			targetType: "faq",
			targetId: "batch",
			metadata: { count: items.length },
		});

		return success("Ordre des questions mis à jour");
	} catch (e) {
		return handleActionError(e, "Erreur lors du réordonnancement des questions");
	}
}
