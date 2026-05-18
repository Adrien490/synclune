"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { updateDiscountSchema } from "../schemas/discount.schemas";
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
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

import { getDiscountInvalidationTags } from "../constants/cache";
import { isCodeAvailable } from "../services/discount-uniqueness.service";

/**
 * Met à jour un code promo existant
 * Réservé aux administrateurs
 */
export async function updateDiscount(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			id: safeFormGet(formData, "id"),
			code: safeFormGet(formData, "code"),
			type: safeFormGet(formData, "type"),
			value: Number(formData.get("value")),
			minOrderAmount: formData.get("minOrderAmount")
				? Number(formData.get("minOrderAmount"))
				: null,
			maxUsageCount: formData.get("maxUsageCount") ? Number(formData.get("maxUsageCount")) : null,
			maxUsagePerUser: formData.get("maxUsagePerUser")
				? Number(formData.get("maxUsagePerUser"))
				: null,
			startsAt: safeFormGet(formData, "startsAt")
				? new Date(safeFormGet(formData, "startsAt")!)
				: null,
			endsAt: safeFormGet(formData, "endsAt") ? new Date(safeFormGet(formData, "endsAt")!) : null,
		};

		const validated = validateInput(updateDiscountSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, ...data } = validated.data;

		// Sanitize text input
		const sanitizedCode = sanitizeText(data.code);

		// Vérifier que le discount existe (et n'est pas supprimé)
		const existing = await prisma.discount.findUnique({
			where: { id, ...notDeleted },
			select: { id: true, code: true },
		});

		if (!existing) {
			return notFound("Code promo");
		}

		// Vérifier l'unicité du code si modifié (includes soft-deleted, matches @unique constraint)
		if (sanitizedCode !== existing.code && !(await isCodeAvailable(sanitizedCode, id))) {
			return error(DISCOUNT_ERROR_MESSAGES.ALREADY_EXISTS);
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
				startsAt: data.startsAt ?? undefined,
				endsAt: data.endsAt,
			},
		});

		// Invalidate list, admin badges, id-based detail, and code-based detail
		getDiscountInvalidationTags(id).forEach((tag) => updateTag(tag));

		return success(`Code promo "${sanitizedCode}" mis à jour`);
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			return error(DISCOUNT_ERROR_MESSAGES.ALREADY_EXISTS);
		}
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
