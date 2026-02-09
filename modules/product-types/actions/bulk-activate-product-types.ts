"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";
import { bulkActivateProductTypesSchema } from "../schemas/product-type.schemas";

export async function bulkActivateProductTypes(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rawData = {
			ids: formData.get("ids") as string,
		};

		const validated = validateInput(bulkActivateProductTypesSchema, rawData);
		if ("error" in validated) return validated.error;

		const { ids } = validated.data;

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
			return error("Impossible de modifier un type systeme");
		}

		// Activer tous les types
		await prisma.productType.updateMany({
			where: {
				id: {
					in: ids,
				},
			},
			data: {
				isActive: true,
			},
		});

		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		return success(`${ids.length} type(s) activé(s) avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible d'activer les types");
	}
}
