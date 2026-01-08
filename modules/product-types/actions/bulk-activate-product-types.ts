"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

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

		const result = bulkActivateProductTypesSchema.safeParse(rawData);
		if (!result.success || result.data.ids.length === 0) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Au moins un type doit être sélectionné",
			};
		}

		const { ids } = result.data;

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
			message: `${ids.length} type(s) activé(s) avec succès`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible d'activer les types");
	}
}
