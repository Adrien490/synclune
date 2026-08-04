"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { createDiscountSchema } from "../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

import { getDiscountInvalidationTags } from "../constants/cache";
import { isCodeAvailable } from "../services/discount-uniqueness.service";

/**
 * Crée un nouveau code promo
 * Réservé aux administrateurs
 */
export async function createDiscount(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 1b. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des données — euros (UX admin) → centimes (DB)
		const type = safeFormGet(formData, "type");
		const rawValueEuros = Number(formData.get("valueEuros"));
		const rawMinOrderEuros = formData.get("minOrderAmountEuros");
		const value =
			type === "FIXED_AMOUNT" ? Math.round(rawValueEuros * 100) : Math.round(rawValueEuros);
		// `"0"` est une chaîne TRUTHY : sans la normalisation en `null`, saisir 0 dans
		// « Montant minimum » produisait `minOrderAmount: 0`, rejeté par le CHECK DB
		// `Discount_minOrderAmount_positive`. Un minimum nul et l'absence de minimum
		// sont la même intention — on n'en persiste qu'une seule forme.
		const parsedMinOrderCents = rawMinOrderEuros
			? Math.round(Number(rawMinOrderEuros) * 100)
			: null;
		const minOrderAmount = parsedMinOrderCents === 0 ? null : parsedMinOrderCents;

		const rawData = {
			code: safeFormGet(formData, "code"),
			type,
			value,
			minOrderAmount,
			maxUsageCount: formData.get("maxUsageCount") ? Number(formData.get("maxUsageCount")) : null,
			maxUsagePerUser: formData.get("maxUsagePerUser")
				? Number(formData.get("maxUsagePerUser"))
				: null,
			endsAt: safeFormGet(formData, "endsAt") ? new Date(safeFormGet(formData, "endsAt")!) : null,
		};

		// 3. Validation
		const validated = validateInput(createDiscountSchema, rawData);
		if ("error" in validated) return validated.error;

		const data = validated.data;

		// 3b. Sanitize text input
		const sanitizedCode = sanitizeText(data.code);

		// 4. Vérifier l'unicité du code
		if (!(await isCodeAvailable(sanitizedCode))) {
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
				endsAt: data.endsAt,
				isActive: true,
			},
			select: { id: true, code: true },
		});

		// 6. Invalidation du cache
		getDiscountInvalidationTags(discount.id, discount.code).forEach((tag) => updateTag(tag));

		return success(`Code promo « ${discount.code} » créé`, { id: discount.id });
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			return error(DISCOUNT_ERROR_MESSAGES.ALREADY_EXISTS);
		}
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.CREATE_FAILED);
	}
}
