"use server";

import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { restoreDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
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
 * Restaure un code promo soft-deleted
 * Réservé aux administrateurs
 *
 * Le code étant @unique au niveau DB (incluant soft-deleted), aucun conflit
 * d'unicité ne peut survenir au moment du restore.
 */
export async function restoreDiscount(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.RESTORE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");

		const validated = validateInput(restoreDiscountSchema, { id: rawId });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		const discount = await prisma.discount.findUnique({
			where: { id },
			select: { id: true, code: true, deletedAt: true },
		});

		if (!discount) {
			return notFound("Code promo");
		}

		if (!discount.deletedAt) {
			return error(DISCOUNT_ERROR_MESSAGES.NOT_DELETED);
		}

		await prisma.discount.update({
			where: { id },
			data: { deletedAt: null },
		});

		getDiscountInvalidationTags(discount.id).forEach((tag) => updateTag(tag));

		return success(`Code promo "${discount.code}" restauré`);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.RESTORE_FAILED);
	}
}
