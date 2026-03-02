"use server";

import { prisma, softDelete, notDeleted } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { deleteDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

import { getDiscountInvalidationTags } from "../constants/cache";

/**
 * Supprime un code promo
 * Réservé aux administrateurs
 *
 * Note: Un code avec des utilisations ne peut pas être supprimé
 * pour préserver l'intégrité de l'historique des commandes
 */
export async function deleteDiscount(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");

		const validated = validateInput(deleteDiscountSchema, { id: rawId });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// Vérifier si le discount a été utilisé
		const discount = await prisma.discount.findUnique({
			where: { id, ...notDeleted },
			select: {
				id: true,
				code: true,
				_count: { select: { usages: true } },
			},
		});

		if (!discount) {
			return notFound("Code promo");
		}

		if (discount._count.usages > 0) {
			return error(DISCOUNT_ERROR_MESSAGES.HAS_USAGES);
		}

		await softDelete.discount(id);

		getDiscountInvalidationTags(discount.code).forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "discount.delete",
			targetType: "discount",
			targetId: id,
			metadata: { code: discount.code },
		});

		return success(`Code promo "${discount.code}" supprimé`);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.DELETE_FAILED);
	}
}
