"use server";

import { prisma } from "@/shared/lib/prisma";
import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { toggleDiscountStatusSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { isAdmin } from "@/shared/lib/guards";

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
		const admin = await isAdmin();
		if (!admin) {
			return { status: ActionStatus.UNAUTHORIZED, message: "Accès non autorisé" };
		}

		const id = formData.get("id") as string;

		const result = toggleDiscountStatusSchema.safeParse({ id });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		const discount = await prisma.discount.findUnique({
			where: { id },
			select: { id: true, code: true, isActive: true },
		});

		if (!discount) {
			return { status: ActionStatus.NOT_FOUND, message: DISCOUNT_ERROR_MESSAGES.NOT_FOUND };
		}

		const newStatus = !discount.isActive;

		await prisma.discount.update({
			where: { id },
			data: { isActive: newStatus },
		});

		revalidatePath("/admin/marketing/codes-promo");
		getDiscountInvalidationTags(discount.code).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: newStatus
				? `Code promo "${discount.code}" activé`
				: `Code promo "${discount.code}" désactivé`,
		};
	} catch (error) {
		console.error("[TOGGLE_DISCOUNT_STATUS]", error);
		return { status: ActionStatus.ERROR, message: DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED };
	}
}
