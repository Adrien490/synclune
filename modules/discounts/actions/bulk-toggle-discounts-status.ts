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
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getDiscountInvalidationTags } from "../constants/cache";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import { bulkToggleDiscountsStatusSchema } from "../schemas/discount.schemas";

/**
 * Active ou désactive en lot un ensemble de codes promo.
 *
 * formData :
 * - `discountIds`     : JSON array de cuid2 (1..100)
 * - `targetIsActive`  : "true" | "false"
 */
export async function bulkToggleDiscountsStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "discountIds");
		if ("error" in idsResult) return idsResult.error;

		const targetIsActive = safeFormGet(formData, "targetIsActive") === "true";

		const validation = validateInput(bulkToggleDiscountsStatusSchema, {
			discountIds: idsResult.ids,
			targetIsActive,
		});
		if ("error" in validation) return validation.error;

		const { discountIds } = validation.data;

		const discounts = await prisma.discount.findMany({
			where: { id: { in: discountIds }, ...notDeleted },
			select: { id: true, code: true, isActive: true },
		});

		if (discounts.length === 0) {
			return error("Aucun code promo valide trouvé");
		}

		const eligible = discounts.filter((d) => d.isActive !== targetIsActive);

		if (eligible.length === 0) {
			return error(
				targetIsActive
					? "Tous les codes sélectionnés sont déjà actifs"
					: "Tous les codes sélectionnés sont déjà inactifs",
			);
		}

		const eligibleIds = eligible.map((d) => d.id);

		await prisma.discount.updateMany({
			where: { id: { in: eligibleIds } },
			data: { isActive: targetIsActive },
		});

		const tags = new Set<string>();
		for (const d of eligible) {
			getDiscountInvalidationTags(d.id).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: targetIsActive ? "discount.bulkActivate" : "discount.bulkDeactivate",
			targetType: "discount",
			targetId: eligibleIds.join(","),
			metadata: {
				count: eligibleIds.length,
				targetIsActive,
				discountIds: eligibleIds,
			},
		});

		const verb = targetIsActive ? "activé" : "désactivé";
		const plural = eligibleIds.length > 1 ? "s" : "";
		return success(`${eligibleIds.length} code${plural} ${verb}${plural} avec succès`, {
			count: eligibleIds.length,
			targetIsActive,
		});
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
