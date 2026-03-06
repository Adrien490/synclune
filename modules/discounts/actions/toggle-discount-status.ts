"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { toggleDiscountStatusSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

import { getDiscountInvalidationTags } from "../constants/cache";

/**
 * Active ou désactive un code promo
 * Réservé aux administrateurs
 */
export async function toggleDiscountStatus(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.TOGGLE_STATUS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");

		const validated = validateInput(toggleDiscountStatusSchema, { id: rawId });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		const discount = await prisma.discount.findUnique({
			where: { id, ...notDeleted },
			select: { id: true, code: true, isActive: true },
		});

		if (!discount) {
			return notFound("Code promo");
		}

		const newStatus = !discount.isActive;

		await prisma.discount.update({
			where: { id },
			data: {
				isActive: newStatus,
				// Track explicit deactivation so the cron won't auto-reactivate it
				manuallyDeactivated: !newStatus,
			},
		});

		getDiscountInvalidationTags(discount.code).forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "discount.toggleStatus",
			targetType: "discount",
			targetId: id,
			metadata: { code: discount.code, oldStatus: discount.isActive, newStatus: newStatus },
		});

		return success(
			newStatus
				? `Code promo "${discount.code}" activé`
				: `Code promo "${discount.code}" désactivé`,
		);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
