"use server";

import { prisma } from "@/shared/lib/prisma";
import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { updateDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { isAdmin } from "@/shared/lib/guards";

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
		const admin = await isAdmin();
		if (!admin) {
			return { status: ActionStatus.UNAUTHORIZED, message: "Accès non autorisé" };
		}

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
				: undefined,
			endsAt: formData.get("endsAt")
				? new Date(formData.get("endsAt") as string)
				: null,
		};

		const result = updateDiscountSchema.safeParse(rawData);
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const { id, ...data } = result.data;

		// Vérifier que le discount existe
		const existing = await prisma.discount.findUnique({
			where: { id },
			select: { id: true, code: true },
		});

		if (!existing) {
			return { status: ActionStatus.NOT_FOUND, message: DISCOUNT_ERROR_MESSAGES.NOT_FOUND };
		}

		// Vérifier l'unicité du code si modifié
		if (data.code !== existing.code) {
			const codeExists = await prisma.discount.findUnique({
				where: { code: data.code },
				select: { id: true },
			});
			if (codeExists) {
				return { status: ActionStatus.CONFLICT, message: DISCOUNT_ERROR_MESSAGES.ALREADY_EXISTS };
			}
		}

		await prisma.discount.update({
			where: { id },
			data: {
				code: data.code,
				type: data.type,
				value: data.value,
				minOrderAmount: data.minOrderAmount,
				maxUsageCount: data.maxUsageCount,
				maxUsagePerUser: data.maxUsagePerUser,
				startsAt: data.startsAt,
				endsAt: data.endsAt,
			},
		});

		revalidatePath("/admin/marketing/codes-promo");
		// Invalider le cache pour l'ancien et le nouveau code si different
		getDiscountInvalidationTags(id).forEach(tag => updateTag(tag));
		if (data.code !== existing.code) {
			getDiscountInvalidationTags(data.code).forEach(tag => updateTag(tag));
		}

		return {
			status: ActionStatus.SUCCESS,
			message: `Code promo "${data.code}" mis à jour`,
		};
	} catch (error) {
		console.error("[UPDATE_DISCOUNT]", error);
		return { status: ActionStatus.ERROR, message: DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED };
	}
}
