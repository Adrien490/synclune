"use server";

import { prisma } from "@/shared/lib/prisma";
import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { deleteDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { isAdmin } from "@/modules/auth/utils/guards";

import { getDiscountInvalidationTags } from "../constants/cache";

/**
 * Supprime un code promo
 * Réservé aux administrateurs
 *
 * Note: Un code avec des utilisations ne peut pas être supprimé
 * pour préserver l'intégrité de l'historique des commandes
 */
export async function deleteDiscount(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return { status: ActionStatus.UNAUTHORIZED, message: "Accès non autorisé" };
		}

		const id = formData.get("id") as string;

		const result = deleteDiscountSchema.safeParse({ id });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		// Vérifier si le discount a été utilisé
		const discount = await prisma.discount.findUnique({
			where: { id },
			select: {
				id: true,
				code: true,
				_count: { select: { usages: true } },
			},
		});

		if (!discount) {
			return { status: ActionStatus.NOT_FOUND, message: DISCOUNT_ERROR_MESSAGES.NOT_FOUND };
		}

		if (discount._count.usages > 0) {
			return {
				status: ActionStatus.ERROR,
				message: DISCOUNT_ERROR_MESSAGES.HAS_USAGES,
			};
		}

		await prisma.discount.delete({ where: { id } });

		revalidatePath("/admin/marketing/codes-promo");
		getDiscountInvalidationTags(discount.code).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Code promo "${discount.code}" supprimé`,
		};
	} catch (error) {
		console.error("[DELETE_DISCOUNT]", error);
		return { status: ActionStatus.ERROR, message: DISCOUNT_ERROR_MESSAGES.DELETE_FAILED };
	}
}
