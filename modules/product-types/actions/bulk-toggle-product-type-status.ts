"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

import { bulkToggleProductTypeStatusSchema } from "../schemas/product-type.schemas";
import { getProductTypeInvalidationTags } from "../utils/cache.utils";

export async function bulkToggleProductTypeStatus(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rawData = {
			ids: formData.get("ids") as string,
			isActive: formData.get("isActive") === "true",
		};

		const result = bulkToggleProductTypeStatusSchema.safeParse(rawData);
		if (!result.success || result.data.ids.length === 0) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Au moins un type doit être sélectionné",
			};
		}

		const { ids, isActive } = result.data;

		// Verifier qu'aucun type systeme n'est selectionne
		const systemTypes = await prisma.productType.findMany({
			where: {
				id: { in: ids },
				isSystem: true,
			},
			select: { id: true, label: true },
		});

		if (systemTypes.length > 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Impossible de modifier un type système",
			};
		}

		// Mettre a jour le statut
		await prisma.productType.updateMany({
			where: {
				id: { in: ids },
			},
			data: { isActive },
		});

		revalidatePath("/admin/catalogue/types-de-produits");
		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		const statusText = isActive ? "activé" : "désactivé";
		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} type(s) ${statusText}(s) avec succès`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des types");
	}
}
