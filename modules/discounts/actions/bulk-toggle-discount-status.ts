"use server";

import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success } from "@/shared/lib/actions";
import { getDiscountInvalidationTags } from "../constants/cache";
import { bulkToggleDiscountStatusSchema } from "../schemas/discount.schemas";

/**
 * Active ou désactive plusieurs codes promo en masse
 * Réservé aux administrateurs
 */
export async function bulkToggleDiscountStatus(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const idsRaw = formData.getAll("ids");
		const isActiveRaw = formData.get("isActive");

		const validated = validateInput(bulkToggleDiscountStatusSchema, {
			ids: idsRaw,
			isActive: isActiveRaw === "true",
		});
		if ("error" in validated) return validated.error;

		const { ids, isActive } = validated.data;

		await prisma.discount.updateMany({
			where: { id: { in: ids } },
			data: { isActive },
		});

		// Invalider la liste des discounts
		getDiscountInvalidationTags().forEach(tag => updateTag(tag));

		const message = isActive
			? `${ids.length} code(s) promo activé(s)`
			: `${ids.length} code(s) promo désactivé(s)`;

		return success(message);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
