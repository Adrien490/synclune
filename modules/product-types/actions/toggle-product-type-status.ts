"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";
import { toggleProductTypeStatusSchema } from "../schemas/product-type.schemas";

export async function toggleProductTypeStatus(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rawData = {
			productTypeId: formData.get("productTypeId") as string,
			isActive: formData.get("isActive") === "true",
		};

		const validated = validateInput(toggleProductTypeStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { productTypeId, isActive } = validated.data;

		// Mettre a jour le statut
		await prisma.productType.update({
			where: { id: productTypeId },
			data: { isActive },
		});

		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		return success(`Type ${isActive ? "activé" : "désactivé"} avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut");
	}
}
