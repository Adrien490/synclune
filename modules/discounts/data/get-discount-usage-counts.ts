import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/shared/lib/prisma";

type DiscountUsageCountsParams = {
	discountId: string;
	userId?: string;
	customerEmail?: string;
};

type DiscountUsageCountsResult = {
	userCount: number;
	emailCount: number;
};

/**
 * Récupère les compteurs d'utilisation d'un code promo
 * - userCount: nombre d'utilisations par l'utilisateur connecté
 * - emailCount: nombre d'utilisations par email (guest checkout)
 */
export async function getDiscountUsageCounts(
	params: DiscountUsageCountsParams
): Promise<DiscountUsageCountsResult> {
	"use cache";

	cacheLife("cart");
	cacheTag(`discount-usage-${params.discountId}`);

	const { discountId, userId, customerEmail } = params;

	let userCount = 0;
	let emailCount = 0;

	if (userId) {
		userCount = await prisma.discountUsage.count({
			where: {
				discountId,
				userId,
			},
		});
	}

	if (customerEmail) {
		emailCount = await prisma.discountUsage.count({
			where: {
				discountId,
				order: {
					customerEmail,
				},
			},
		});
	}

	return { userCount, emailCount };
}
