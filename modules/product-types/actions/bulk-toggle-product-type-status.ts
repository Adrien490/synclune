"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

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

		const validated = validateInput(bulkToggleProductTypeStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { ids, isActive } = validated.data;

		if (ids.length === 0) {
			return error("Au moins un type doit être sélectionné");
		}

		// Verifier qu'aucun type systeme n'est selectionne
		const systemTypes = await prisma.productType.findMany({
			where: {
				id: { in: ids },
				isSystem: true,
			},
			select: { id: true, label: true },
		});

		if (systemTypes.length > 0) {
			return error("Impossible de modifier un type système");
		}

		// Mettre a jour le statut
		await prisma.productType.updateMany({
			where: {
				id: { in: ids },
			},
			data: { isActive },
		});

		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		const statusText = isActive ? "activé" : "désactivé";
		return success(`${ids.length} type(s) ${statusText}(s) avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des types");
	}
}
