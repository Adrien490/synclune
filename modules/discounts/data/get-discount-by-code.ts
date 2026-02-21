import { prisma, notDeleted } from "@/shared/lib/prisma";

import { cacheDiscountDetail } from "../constants/cache";
import { GET_DISCOUNT_VALIDATION_SELECT } from "../constants/discount.constants";
import { getDiscountByCodeSchema } from "../schemas/discount.schemas";
import type { GetDiscountByCodeParams, GetDiscountByCodeReturn } from "../types/discount.types";

// Re-export pour compatibilité
export type { GetDiscountByCodeParams, GetDiscountByCodeReturn } from "../types/discount.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un code promo par son code (pour validation checkout)
 * Utilise un select minimal pour les performances
 */
export async function getDiscountByCode(
	params: Partial<GetDiscountByCodeParams>
): Promise<GetDiscountByCodeReturn> {
	const validation = getDiscountByCodeSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	return fetchDiscountByCode(validation.data);
}

/**
 * Récupère le discount depuis la DB avec cache
 */
async function fetchDiscountByCode(
	params: GetDiscountByCodeParams
): Promise<GetDiscountByCodeReturn> {
	"use cache";
	cacheDiscountDetail(params.code);

	try {
		const discount = await prisma.discount.findFirst({
			where: { code: params.code, ...notDeleted },
			select: GET_DISCOUNT_VALIDATION_SELECT,
		});

		return discount;
	} catch {
		return null;
	}
}
