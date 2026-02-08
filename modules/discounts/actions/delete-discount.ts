"use server";

import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { deleteDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound, error } from "@/shared/lib/actions";

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
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const id = formData.get("id") as string;

		const validated = validateInput(deleteDiscountSchema, { id });
		if ("error" in validated) return validated.error;

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
			return notFound("Code promo");
		}

		if (discount._count.usages > 0) {
			return error(DISCOUNT_ERROR_MESSAGES.HAS_USAGES);
		}

		await prisma.discount.delete({ where: { id } });

		getDiscountInvalidationTags(discount.code).forEach(tag => updateTag(tag));

		return success(`Code promo "${discount.code}" supprimé`);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.DELETE_FAILED);
	}
}
