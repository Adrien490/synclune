"use server";

import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { bulkDeleteDiscountsSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";

import { getDiscountInvalidationTags } from "../constants/cache";

/**
 * Supprime plusieurs codes promo en masse
 * Réservé aux administrateurs
 *
 * Note: Seuls les codes sans utilisation seront supprimés
 */
export async function bulkDeleteDiscounts(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const idsRaw = formData.get("ids") as string;
		const ids = idsRaw ? JSON.parse(idsRaw) : [];

		const validated = validateInput(bulkDeleteDiscountsSchema, { ids });
		if ("error" in validated) return validated.error;

		// Récupérer les discounts sans utilisation
		const discounts = await prisma.discount.findMany({
			where: {
				id: { in: validated.data.ids },
			},
			select: {
				id: true,
				code: true,
				_count: { select: { usages: true } },
			},
		});

		const deletableIds = discounts
			.filter((d) => d._count.usages === 0)
			.map((d) => d.id);

		const skippedCount = discounts.length - deletableIds.length;

		if (deletableIds.length === 0) {
			return error("Aucun code ne peut être supprimé (tous ont des utilisations)");
		}

		await prisma.discount.deleteMany({
			where: { id: { in: deletableIds } },
		});

		// Invalider le cache pour chaque discount supprimé
		for (const discount of discounts.filter((d) => deletableIds.includes(d.id))) {
			getDiscountInvalidationTags(discount.code).forEach(tag => updateTag(tag));
		}

		const message =
			skippedCount > 0
				? `${deletableIds.length} code(s) supprimé(s), ${skippedCount} ignoré(s) (déjà utilisés)`
				: `${deletableIds.length} code(s) supprimé(s)`;

		return success(message);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.DELETE_FAILED);
	}
}
