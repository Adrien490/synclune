"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
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

		// Exclure les types systeme (skip partiel)
		const systemTypes = await prisma.productType.findMany({
			where: {
				id: { in: ids },
				isSystem: true,
			},
			select: { id: true, label: true },
		});

		const systemIds = new Set(systemTypes.map((t) => t.id));
		const activatableIds = ids.filter((id) => !systemIds.has(id));

		if (activatableIds.length === 0) {
			return error(`Aucun type modifiable. ${systemTypes.length} type(s) systeme ignore(s)`);
		}

		// Activer les types eligibles
		await prisma.productType.updateMany({
			where: { id: { in: activatableIds } },
			data: { isActive: true },
		});

		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		let message = `${activatableIds.length} type(s) active(s) avec succes`;
		if (systemTypes.length > 0) {
			message += ` - ${systemTypes.length} type(s) systeme ignore(s)`;
		}

		return success(message);
	} catch (e) {
		return handleActionError(e, "Impossible d'activer les types");
	}
}
