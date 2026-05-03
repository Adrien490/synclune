import { cacheLife, cacheTag } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchProductTypeItem = {
	id: string;
	label: string;
	slug: string;
	isActive: boolean;
	isSystem: boolean;
	productCount: number;
};

export type AdminQuickSearchProductTypesResult =
	| { kind: "success"; items: AdminQuickSearchProductTypeItem[]; totalCount: number }
	| { kind: "error" };

export async function quickSearchProductTypesAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchProductTypesResult> {
	"use cache";
	cacheLife("user");
	cacheTag(PRODUCT_TYPES_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where: Prisma.ProductTypeWhereInput = {
			...notDeleted,
			OR: [
				{ label: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ slug: { contains: term, mode: Prisma.QueryMode.insensitive } },
			],
		};

		const [types, totalCount] = await Promise.all([
			prisma.productType.findMany({
				where,
				orderBy: { label: "asc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					label: true,
					slug: true,
					isActive: true,
					isSystem: true,
					_count: { select: { products: true } },
				},
			}),
			prisma.productType.count({ where }),
		]);

		const items: AdminQuickSearchProductTypeItem[] = types.map((t) => ({
			id: t.id,
			label: t.label,
			slug: t.slug,
			isActive: t.isActive,
			isSystem: t.isSystem,
			productCount: t._count.products,
		}));

		return { kind: "success", items, totalCount };
	} catch (error) {
		logger.error("Admin quick search product types failed", error, {
			service: "quickSearchProductTypesAdmin",
		});
		return { kind: "error" };
	}
}
