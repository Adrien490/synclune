"use server";

import { prisma } from "@/shared/lib/prisma";
import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { createDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { isAdmin } from "@/shared/lib/guards";

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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

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
				: undefined,
			endsAt: formData.get("endsAt")
				? new Date(formData.get("endsAt") as string)
				: null,
		};

		// 3. Validation
		const result = createDiscountSchema.safeParse(rawData);
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const data = result.data;

		// 4. Vérifier l'unicité du code
		const existingDiscount = await prisma.discount.findUnique({
			where: { code: data.code },
			select: { id: true },
		});

		if (existingDiscount) {
			return {
				status: ActionStatus.CONFLICT,
				message: DISCOUNT_ERROR_MESSAGES.ALREADY_EXISTS,
			};
		}

		// 5. Créer le discount
		const discount = await prisma.discount.create({
			data: {
				code: data.code,
				type: data.type,
				value: data.value,
				minOrderAmount: data.minOrderAmount,
				maxUsageCount: data.maxUsageCount,
				maxUsagePerUser: data.maxUsagePerUser,
				startsAt: data.startsAt,
				endsAt: data.endsAt,
				isActive: true,
			},
			select: { id: true, code: true },
		});

		// 6. Revalidation et invalidation du cache
		revalidatePath("/admin/marketing/codes-promo");
		getDiscountInvalidationTags(discount.code).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Code promo "${discount.code}" créé avec succès`,
			data: { id: discount.id },
		};
	} catch (error) {
		console.error("[CREATE_DISCOUNT]", error);
		return {
			status: ActionStatus.ERROR,
			message: DISCOUNT_ERROR_MESSAGES.CREATE_FAILED,
		};
	}
}
