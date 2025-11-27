"use server";

import { isAdmin } from "@/shared/lib/guards";

import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";
import { toggleProductTypeStatusSchema } from "../schemas/product-type.schemas";

export async function toggleProductTypeStatus(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé. Droits administrateur requis.",
			};
		}

		const rawData = {
			productTypeId: formData.get("productTypeId") as string,
			isActive: formData.get("isActive") === "true",
		};

		const { productTypeId, isActive } = toggleProductTypeStatusSchema.parse(rawData);

		// Mettre a jour le statut
		await prisma.productType.update({
			where: { id: productTypeId },
			data: { isActive },
		});

		revalidatePath("/admin/catalogue/types-de-produits");
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);

		return {
			status: ActionStatus.SUCCESS,
			message: `Type ${isActive ? "active" : "desactive"} avec succes`,
		};
	} catch (error) {
// console.error("[toggleProductTypeStatus]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible de modifier le statut",
		};
	}
}
