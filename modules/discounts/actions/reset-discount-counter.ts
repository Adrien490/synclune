"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { resetDiscountCounterSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

import { getDiscountInvalidationTags } from "../constants/cache";

/**
 * Réinitialise le compteur d'utilisation (usageCount) d'un code promo à 0.
 * Réservé aux administrateurs.
 *
 * Cas d'usage : admin réutilise un code expiré pour une nouvelle campagne et
 * souhaite repartir à zéro sans toucher l'historique des `DiscountUsage` (audit
 * comptable préservé). La relation `usages` reste intacte ; seul le compteur
 * dénormalisé est remis à 0.
 *
 * Note : si maxUsageCount est défini, ce reset autorise à nouveau N utilisations.
 */
export async function resetDiscountCounter(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.RESET_COUNTER);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");

		const validated = validateInput(resetDiscountCounterSchema, { id: rawId });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		const discount = await prisma.discount.findUnique({
			where: { id, ...notDeleted },
			select: { id: true, code: true, usageCount: true },
		});

		if (!discount) {
			return notFound("Code promo");
		}

		if (discount.usageCount === 0) {
			return success(`Code "${discount.code}" : compteur déjà à zéro, aucune action nécessaire`);
		}

		await prisma.discount.update({
			where: { id },
			data: { usageCount: 0 },
		});

		getDiscountInvalidationTags(id).forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "discount.resetCounter",
			targetType: "discount",
			targetId: id,
			metadata: {
				code: discount.code,
				previousUsageCount: discount.usageCount,
			},
		});

		return success(
			`Compteur du code "${discount.code}" réinitialisé (était à ${discount.usageCount})`,
		);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.RESET_COUNTER_FAILED);
	}
}
