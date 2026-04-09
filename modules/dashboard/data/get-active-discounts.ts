import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

import type { ActiveDiscountItem, GetActiveDiscountsReturn } from "../types/dashboard.types";

export type { GetActiveDiscountsReturn } from "../types/dashboard.types";

/**
 * Fetches top 5 active discount codes sorted by usage
 */
export async function fetchActiveDiscounts(): Promise<GetActiveDiscountsReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.ACTIVE_DISCOUNTS);

	const discounts = await prisma.discount.findMany({
		where: {
			isActive: true,
			deletedAt: null,
			OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
		},
		select: {
			id: true,
			code: true,
			type: true,
			value: true,
			usageCount: true,
			maxUsageCount: true,
			endsAt: true,
		},
		orderBy: { usageCount: "desc" },
		take: 5,
	});

	const items: ActiveDiscountItem[] = discounts.map((d) => ({
		id: d.id,
		code: d.code,
		type: d.type,
		value: d.value,
		usageCount: d.usageCount,
		maxUsageCount: d.maxUsageCount,
		endsAt: d.endsAt,
	}));

	return { discounts: items };
}
