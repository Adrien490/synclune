"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { extendDiscountValiditySchema } from "../schemas/discount.schemas";
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Prolonge la date de fin (endsAt) d'un code promo de N jours.
 * Réservé aux administrateurs.
 *
 * UX courant : promo qui expire ce soir, prolongation d'une semaine en 1 clic
 * sans avoir à rouvrir le formulaire complet d'édition.
 *
 * - Si le code n'a pas de endsAt, l'action retourne une erreur (utiliser update).
 * - Le point de départ du calcul est `MAX(now, endsAt actuel)` :
 *   prolonger une promo expirée la rend à nouveau valide pour N jours à partir d'aujourd'hui.
 */
export async function extendDiscountValidity(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.EXTEND_VALIDITY);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			id: safeFormGet(formData, "id"),
			days: Number(formData.get("days")),
		};

		const validated = validateInput(extendDiscountValiditySchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, days } = validated.data;

		const discount = await prisma.discount.findUnique({
			where: { id, ...notDeleted },
			select: { id: true, code: true, endsAt: true },
		});

		if (!discount) {
			return notFound("Code promo");
		}

		if (!discount.endsAt) {
			return error(DISCOUNT_ERROR_MESSAGES.EXTEND_NO_END_DATE);
		}

		const now = new Date();
		const baseDate = discount.endsAt > now ? discount.endsAt : now;
		const newEndsAt = new Date(baseDate.getTime() + days * MS_PER_DAY);

		await prisma.discount.update({
			where: { id },
			data: { endsAt: newEndsAt },
		});

		getDiscountInvalidationTags(id, discount.code).forEach((tag) => updateTag(tag));

		return success(`Code "${discount.code}" prolongé de ${days} jour(s)`);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.EXTEND_FAILED);
	}
}
