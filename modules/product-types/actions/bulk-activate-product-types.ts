"use server";

import { isAdmin } from "@/shared/lib/guards";

import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";
import { bulkActivateProductTypesSchema } from "../schemas/product-type.schemas";

export async function bulkActivateProductTypes(
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
			ids: formData.get("ids") as string,
		};

		const { ids } = bulkActivateProductTypesSchema.parse(rawData);

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun type selectionne",
			};
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
			return {
				status: ActionStatus.ERROR,
				message: "Impossible de modifier un type systeme",
			};
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

		revalidatePath("/admin/catalogue/types-de-produits");
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);

		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} type(s) active(s) avec succes`,
		};
	} catch (error) {
// console.error("[bulkActivateProductTypes]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible d'activer les types",
		};
	}
}
