"use server";

import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { toggleDiscountStatusSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";

import { getDiscountInvalidationTags } from "../constants/cache";

/**
 * Active ou désactive un code promo
 * Réservé aux administrateurs
 */
export async function toggleDiscountStatus(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const id = formData.get("id") as string;

		const validated = validateInput(toggleDiscountStatusSchema, { id });
		if ("error" in validated) return validated.error;

		const discount = await prisma.discount.findUnique({
			where: { id, deletedAt: null },
			select: { id: true, code: true, isActive: true },
		});

		if (!discount) {
			return notFound("Code promo");
		}

		const newStatus = !discount.isActive;

		await prisma.discount.update({
			where: { id },
			data: { isActive: newStatus },
		});

		getDiscountInvalidationTags(discount.code).forEach(tag => updateTag(tag));

		return success(
			newStatus
				? `Code promo "${discount.code}" activé`
				: `Code promo "${discount.code}" désactivé`
		);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
