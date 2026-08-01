import { isAdmin } from "@/modules/auth/utils/guards";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { cacheDiscountDetailAdmin } from "../constants/cache";
import { GET_DISCOUNT_SELECT } from "../constants/discount.constants";
import { getDiscountSchema } from "../schemas/discount.schemas";
import type { GetDiscountParams, GetDiscountReturn } from "../types/discount.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un code promo par son ID. **Admin uniquement.**
 *
 * Même raisonnement que `getDiscounts` : la garde vit ici, pas seulement dans
 * `app/admin/layout.tsx`, parce qu'un layout partagé n'est pas ré-exécuté lors
 * d'une navigation client. `isAdmin()` re-vérifie le rôle en base.
 */
export async function getDiscountById(
	params: Partial<GetDiscountParams>,
): Promise<GetDiscountReturn> {
	if (!(await isAdmin())) return null;

	const validation = getDiscountSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	return fetchDiscount(validation.data);
}

/**
 * Récupère le discount depuis la DB avec cache
 */
async function fetchDiscount(params: GetDiscountParams): Promise<GetDiscountReturn> {
	"use cache";
	cacheDiscountDetailAdmin(params.id);

	try {
		const discount = await prisma.discount.findUnique({
			where: { id: params.id, ...notDeleted },
			select: GET_DISCOUNT_SELECT,
		});

		return discount;
	} catch (error) {
		logger.error("Failed to fetch discount by id", error, { service: "fetchDiscount" });
		return null;
	}
}
