import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { DISCOUNT_CACHE_TAGS } from "../../constants/cache";

export type DiscountUsageItem = {
	id: string;
	createdAt: Date;
	amountApplied: number;
	user: {
		id: string;
		name: string | null;
		email: string;
	} | null;
	order: {
		id: string;
		orderNumber: string;
		total: number;
	};
};

type DiscountUsagesResult = {
	usages: DiscountUsageItem[];
	totalAmount: number;
};

/**
 * Fonction cachee pour recuperer les utilisations d'un code promo
 */
async function fetchDiscountUsages(discountId: string): Promise<DiscountUsagesResult> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(DISCOUNT_CACHE_TAGS.DETAIL(discountId));

	const usages = await prisma.discountUsage.findMany({
		where: { discountId },
		select: {
			id: true,
			createdAt: true,
			amountApplied: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			order: {
				select: {
					id: true,
					orderNumber: true,
					total: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	const totalAmount = usages.reduce((sum, usage) => sum + usage.amountApplied, 0);

	return {
		usages: usages.map((u) => ({
			id: u.id,
			createdAt: u.createdAt,
			amountApplied: u.amountApplied,
			user: u.user,
			order: u.order,
		})),
		totalAmount,
	};
}

/**
 * Recupere les utilisations d'un code promo (admin only)
 *
 * Wrapper pattern: verification admin puis appel fonction cachee
 */
export async function getDiscountUsages(
	discountId: string
): Promise<DiscountUsagesResult | { error: string }> {
	const adminCheck = await requireAdmin();
	if ("error" in adminCheck) {
		return { error: adminCheck.error.message };
	}

	return fetchDiscountUsages(discountId);
}
