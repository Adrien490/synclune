"use server";

import { prisma } from "@/shared/lib/prisma";
import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { bulkDeleteDiscountsSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { isAdmin } from "@/modules/auth/utils/guards";

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
		const admin = await isAdmin();
		if (!admin) {
			return { status: ActionStatus.UNAUTHORIZED, message: "Accès non autorisé" };
		}

		const idsRaw = formData.get("ids") as string;
		const ids = idsRaw ? JSON.parse(idsRaw) : [];

		const result = bulkDeleteDiscountsSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Récupérer les discounts sans utilisation
		const discounts = await prisma.discount.findMany({
			where: {
				id: { in: result.data.ids },
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
			return {
				status: ActionStatus.ERROR,
				message: "Aucun code ne peut être supprimé (tous ont des utilisations)",
			};
		}

		await prisma.discount.deleteMany({
			where: { id: { in: deletableIds } },
		});

		revalidatePath("/admin/marketing/codes-promo");
		// Invalider le cache pour chaque discount supprimé
		for (const discount of discounts.filter((d) => deletableIds.includes(d.id))) {
			getDiscountInvalidationTags(discount.code).forEach(tag => updateTag(tag));
		}

		const message =
			skippedCount > 0
				? `${deletableIds.length} code(s) supprimé(s), ${skippedCount} ignoré(s) (déjà utilisés)`
				: `${deletableIds.length} code(s) supprimé(s)`;

		return { status: ActionStatus.SUCCESS, message };
	} catch (error) {
		console.error("[BULK_DELETE_DISCOUNTS]", error);
		return { status: ActionStatus.ERROR, message: DISCOUNT_ERROR_MESSAGES.DELETE_FAILED };
	}
}
