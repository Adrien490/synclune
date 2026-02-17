"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { bulkDeactivateProductTypesSchema } from "../schemas/product-type.schemas";

export async function bulkDeactivateProductTypes(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			ids: formData.get("ids") as string,
		};

		const validated = validateInput(bulkDeactivateProductTypesSchema, rawData);
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
		const deactivatableIds = ids.filter((id) => !systemIds.has(id));

		if (deactivatableIds.length === 0) {
			return error(`Aucun type modifiable. ${systemTypes.length} type(s) systeme ignore(s)`);
		}

		// Desactiver les types eligibles
		await prisma.productType.updateMany({
			where: { id: { in: deactivatableIds } },
			data: { isActive: false },
		});

		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		let message = `${deactivatableIds.length} type(s) desactive(s) avec succes`;
		if (systemTypes.length > 0) {
			message += ` - ${systemTypes.length} type(s) systeme ignore(s)`;
		}

		return success(message);
	} catch (e) {
		return handleActionError(e, "Impossible de désactiver les types");
	}
}
