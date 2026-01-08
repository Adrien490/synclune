"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

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

		const result = toggleProductTypeStatusSchema.safeParse(rawData);
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const { productTypeId, isActive } = result.data;

		// Mettre a jour le statut
		await prisma.productType.update({
			where: { id: productTypeId },
			data: { isActive },
		});

		revalidatePath("/admin/catalogue/types-de-produits");
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);

		return {
			status: ActionStatus.SUCCESS,
			message: `Type ${isActive ? "activé" : "désactivé"} avec succès`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut");
	}
}
