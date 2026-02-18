"use server";

import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { createDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

import { getDiscountInvalidationTags } from "../constants/cache";

/**
 * Crée un nouveau code promo
 * Réservé aux administrateurs
 */
export async function createDiscount(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 1b. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des données
		const rawData = {
			code: formData.get("code") as string,
			type: formData.get("type") as string,
			value: Number(formData.get("value")),
			minOrderAmount: formData.get("minOrderAmount")
				? Number(formData.get("minOrderAmount"))
				: null,
			maxUsageCount: formData.get("maxUsageCount")
				? Number(formData.get("maxUsageCount"))
				: null,
			maxUsagePerUser: formData.get("maxUsagePerUser")
				? Number(formData.get("maxUsagePerUser"))
				: null,
			startsAt: formData.get("startsAt")
				? new Date(formData.get("startsAt") as string)
				: null,
			endsAt: formData.get("endsAt")
				? new Date(formData.get("endsAt") as string)
				: null,
		};

		// 3. Validation
		const validated = validateInput(createDiscountSchema, rawData);
		if ("error" in validated) return validated.error;

		const data = validated.data;

		// 3b. Sanitize text input
		const sanitizedCode = sanitizeText(data.code);

		// 4. Vérifier l'unicité du code
		const existingDiscount = await prisma.discount.findUnique({
			where: { code: sanitizedCode },
			select: { id: true },
		});

		if (existingDiscount) {
			return error(DISCOUNT_ERROR_MESSAGES.ALREADY_EXISTS);
		}

		// 5. Créer le discount
		const discount = await prisma.discount.create({
			data: {
				code: sanitizedCode,
				type: data.type,
				value: data.value,
				minOrderAmount: data.minOrderAmount,
				maxUsageCount: data.maxUsageCount,
				maxUsagePerUser: data.maxUsagePerUser,
				startsAt: data.startsAt ?? new Date(),
				endsAt: data.endsAt,
				isActive: true,
			},
			select: { id: true, code: true },
		});

		// 6. Invalidation du cache
		getDiscountInvalidationTags(discount.code).forEach(tag => updateTag(tag));

		return success(`Code promo "${discount.code}" créé avec succès`, { id: discount.id });
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.CREATE_FAILED);
	}
}
