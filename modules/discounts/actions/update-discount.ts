"use server";

import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { updateDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";

import { getDiscountInvalidationTags } from "../constants/cache";

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

		// Vérifier que le discount existe
		const existing = await prisma.discount.findUnique({
			where: { id },
			select: { id: true, code: true },
		});

		if (!existing) {
			return notFound("Code promo");
		}

		// Vérifier l'unicité du code si modifié
		if (sanitizedCode !== existing.code) {
			const codeExists = await prisma.discount.findUnique({
				where: { code: sanitizedCode },
				select: { id: true },
			});
			if (codeExists) {
				return { status: ActionStatus.CONFLICT, message: DISCOUNT_ERROR_MESSAGES.ALREADY_EXISTS };
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

		// Invalider le cache pour l'ancien et le nouveau code si different
		getDiscountInvalidationTags(id).forEach(tag => updateTag(tag));
		if (sanitizedCode !== existing.code) {
			getDiscountInvalidationTags(sanitizedCode).forEach(tag => updateTag(tag));
		}

		return success(`Code promo "${sanitizedCode}" mis à jour`);
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
