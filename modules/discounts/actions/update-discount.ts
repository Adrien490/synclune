"use server";

import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { updateDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound, error } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

import { getDiscountInvalidationTags, DISCOUNT_CACHE_TAGS } from "../constants/cache";

/**
 * Met à jour un code promo existant
 * Réservé aux administrateurs
 */
export async function updateDiscount(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			id: formData.get("id") as string,
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

		const validated = validateInput(updateDiscountSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, ...data } = validated.data;

		// Sanitize text input
		const sanitizedCode = sanitizeText(data.code);

		// Vérifier que le discount existe (et n'est pas supprimé)
		const existing = await prisma.discount.findUnique({
			where: { id, deletedAt: null },
			select: { id: true, code: true },
		});

		if (!existing) {
			return notFound("Code promo");
		}

		// Vérifier l'unicité du code si modifié
		if (sanitizedCode !== existing.code) {
			const codeExists = await prisma.discount.findFirst({
				where: { code: sanitizedCode, deletedAt: null },
				select: { id: true },
			});
			if (codeExists) {
				return error(DISCOUNT_ERROR_MESSAGES.ALREADY_EXISTS);
			}
		}

		await prisma.discount.update({
			where: { id },
			data: {
				code: sanitizedCode,
				type: data.type,
				value: data.value,
				minOrderAmount: data.minOrderAmount,
				maxUsageCount: data.maxUsageCount,
				maxUsagePerUser: data.maxUsagePerUser,
				// startsAt is NOT NULL, so only update if provided
				...(data.startsAt && { startsAt: data.startsAt }),
				endsAt: data.endsAt,
			},
		});

		// Invalidate cache for: list, id-based detail, and code-based detail
		getDiscountInvalidationTags(id).forEach(tag => updateTag(tag));
		// Always invalidate the old code's cache (used by get-discount-by-code)
		updateTag(DISCOUNT_CACHE_TAGS.DETAIL(existing.code));
		if (sanitizedCode !== existing.code) {
			// Also invalidate the new code if it changed
			getDiscountInvalidationTags(sanitizedCode).forEach(tag => updateTag(tag));
		}

		return success(`Code promo "${sanitizedCode}" mis à jour`);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
