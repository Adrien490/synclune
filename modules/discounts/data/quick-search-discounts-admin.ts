import { cacheLife, cacheTag } from "next/cache";

import { Prisma, type DiscountType } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { DISCOUNT_CACHE_TAGS } from "../constants/cache";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchDiscountItem = {
	id: string;
	code: string;
	type: DiscountType;
	value: number;
	isActive: boolean;
	usageCount: number;
	endsAt: Date | null;
};

export type AdminQuickSearchDiscountsResult =
	| { kind: "success"; items: AdminQuickSearchDiscountItem[]; totalCount: number }
	| { kind: "error" };

export async function quickSearchDiscountsAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchDiscountsResult> {
	"use cache";
	cacheLife("user");
	cacheTag(DISCOUNT_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where: Prisma.DiscountWhereInput = {
			...notDeleted,
			code: { contains: term, mode: Prisma.QueryMode.insensitive },
		};

		const [discounts, totalCount] = await Promise.all([
			prisma.discount.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					code: true,
					type: true,
					value: true,
					isActive: true,
					usageCount: true,
					endsAt: true,
				},
			}),
			prisma.discount.count({ where }),
		]);

		return { kind: "success", items: discounts, totalCount };
	} catch (error) {
		logger.error("Admin quick search discounts failed", error, {
			service: "quickSearchDiscountsAdmin",
		});
		return { kind: "error" };
	}
}
