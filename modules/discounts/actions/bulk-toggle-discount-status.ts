"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { validateInput, handleActionError, success } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";
import { getDiscountInvalidationTags } from "../constants/cache";
import { bulkToggleDiscountStatusSchema } from "../schemas/discount.schemas";

/**
 * Active ou désactive plusieurs codes promo en masse
 * Réservé aux administrateurs
 */
export async function bulkToggleDiscountStatus(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsRaw = formData.getAll("ids");
		const isActiveRaw = formData.get("isActive");

		const validated = validateInput(bulkToggleDiscountStatusSchema, {
			ids: idsRaw,
			isActive: isActiveRaw === "true",
		});
		if ("error" in validated) return validated.error;

		const { ids, isActive } = validated.data;

		await prisma.discount.updateMany({
			where: { id: { in: ids }, ...notDeleted },
			data: { isActive },
		});

		// Fetch affected codes for detail cache invalidation
		const updated = await prisma.discount.findMany({
			where: { id: { in: ids }, ...notDeleted },
			select: { code: true },
		});

		// Invalidate list + detail caches for each affected discount
		const tags = new Set<string>(getDiscountInvalidationTags());
		for (const d of updated) {
			for (const tag of getDiscountInvalidationTags(d.code)) {
				tags.add(tag);
			}
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "discount.bulkToggleStatus",
			targetType: "discount",
			targetId: ids.join(","),
			metadata: { count: ids.length, isActive },
		});

		const message = isActive
			? `${ids.length} code(s) promo activé(s)`
			: `${ids.length} code(s) promo désactivé(s)`;

		return success(message);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
