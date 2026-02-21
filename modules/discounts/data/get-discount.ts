import { prisma, notDeleted } from "@/shared/lib/prisma";

import { cacheDiscountDetail } from "../constants/cache";
import { GET_DISCOUNT_SELECT } from "../constants/discount.constants";
import { getDiscountSchema } from "../schemas/discount.schemas";
import type { GetDiscountParams, GetDiscountReturn } from "../types/discount.types";

// Re-export pour compatibilité
export type { GetDiscountParams, GetDiscountReturn } from "../types/discount.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un code promo par son ID
 */
export async function getDiscountById(
	params: Partial<GetDiscountParams>
): Promise<GetDiscountReturn> {
	const validation = getDiscountSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	return fetchDiscount(validation.data);
}

/**
 * Récupère le discount depuis la DB avec cache
 */
async function fetchDiscount(
	params: GetDiscountParams
): Promise<GetDiscountReturn> {
	"use cache";
	cacheDiscountDetail(params.id);

	try {
		const discount = await prisma.discount.findUnique({
			where: { id: params.id, ...notDeleted },
			select: GET_DISCOUNT_SELECT,
		});

		return discount;
	} catch {
		return null;
	}
}
