"use server";

import { prisma } from "@/shared/lib/prisma";
import { revalidatePath } from "next/cache";
import { updateTags } from "@/shared/lib/cache";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { isAdmin } from "@/shared/lib/guards";
import { z } from "zod";

import { getDiscountInvalidationTags } from "../constants/cache";

const bulkToggleDiscountStatusSchema = z.object({
	ids: z.array(z.cuid2()).min(1, "Au moins un code doit être sélectionné"),
	isActive: z.boolean(),
});

/**
 * Active ou désactive plusieurs codes promo en masse
 * Réservé aux administrateurs
 */
export async function bulkToggleDiscountStatus(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return { status: ActionStatus.UNAUTHORIZED, message: "Accès non autorisé" };
		}

		const idsRaw = formData.getAll("ids");
		const isActiveRaw = formData.get("isActive");

		const result = bulkToggleDiscountStatusSchema.safeParse({
			ids: idsRaw,
			isActive: isActiveRaw === "true",
		});

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const { ids, isActive } = result.data;

		await prisma.discount.updateMany({
			where: { id: { in: ids } },
			data: { isActive },
		});

		revalidatePath("/admin/marketing/codes-promo");
		// Invalider la liste des discounts
		updateTags(getDiscountInvalidationTags());

		const message = isActive
			? `${ids.length} code(s) promo activé(s)`
			: `${ids.length} code(s) promo désactivé(s)`;

		return { status: ActionStatus.SUCCESS, message };
	} catch (error) {
		console.error("[BULK_TOGGLE_DISCOUNT_STATUS]", error);
		return { status: ActionStatus.ERROR, message: DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED };
	}
}
