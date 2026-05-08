"use server";

import { updateTag } from "next/cache";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { bulkToggleProductTypeStatusSchema } from "../schemas/product-type.schemas";
import { getProductTypeInvalidationTags } from "../utils/cache.utils";

/**
 * Active ou désactive en lot un ensemble de types de produits.
 * Les types système (`isSystem === true`) sont exclus automatiquement.
 *
 * formData :
 * - `productTypeIds`  : JSON array cuid2 (1..100)
 * - `targetIsActive`  : "true" | "false"
 */
export async function bulkToggleProductTypesStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(
			ADMIN_PRODUCT_TYPE_LIMITS.BULK_OPERATIONS,
		);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "productTypeIds");
		if ("error" in idsResult) return idsResult.error;

		const targetIsActive = safeFormGet(formData, "targetIsActive") === "true";

		const validation = validateInput(bulkToggleProductTypeStatusSchema, {
			productTypeIds: idsResult.ids,
			targetIsActive,
		});
		if ("error" in validation) return validation.error;

		const { productTypeIds } = validation.data;

		const productTypes = await prisma.productType.findMany({
			where: { id: { in: productTypeIds } },
			select: { id: true, label: true, isActive: true, isSystem: true },
		});

		if (productTypes.length === 0) {
			return error("Aucun type valide trouvé");
		}

		const eligible = productTypes.filter((pt) => !pt.isSystem && pt.isActive !== targetIsActive);

		if (eligible.length === 0) {
			const allSystem = productTypes.every((pt) => pt.isSystem);
			if (allSystem) {
				return error("Les types système ne peuvent pas être modifiés");
			}
			return error(
				targetIsActive
					? "Tous les types sélectionnés sont déjà actifs"
					: "Tous les types sélectionnés sont déjà inactifs",
			);
		}

		const eligibleIds = eligible.map((pt) => pt.id);

		await prisma.productType.updateMany({
			where: { id: { in: eligibleIds } },
			data: { isActive: targetIsActive },
		});

		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: targetIsActive ? "productType.bulkActivate" : "productType.bulkDeactivate",
			targetType: "productType",
			targetId: eligibleIds.join(","),
			metadata: {
				count: eligibleIds.length,
				targetIsActive,
				productTypeIds: eligibleIds,
				skippedSystem: productTypes.filter((pt) => pt.isSystem).length,
			},
		});

		const verb = targetIsActive ? "activé" : "désactivé";
		const plural = eligibleIds.length > 1 ? "s" : "";
		return success(`${eligibleIds.length} type${plural} ${verb}${plural} avec succès`, {
			count: eligibleIds.length,
			targetIsActive,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'opération groupée");
	}
}
