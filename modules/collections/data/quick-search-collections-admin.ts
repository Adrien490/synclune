import { cacheLife, cacheTag } from "next/cache";

import { Prisma, type CollectionStatus } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchCollectionItem = {
	id: string;
	slug: string;
	name: string;
	status: CollectionStatus;
	productCount: number;
};

export type AdminQuickSearchCollectionsResult =
	| { kind: "success"; items: AdminQuickSearchCollectionItem[]; totalCount: number }
	| { kind: "error" };

export async function quickSearchCollectionsAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchCollectionsResult> {
	"use cache";
	cacheLife("user");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where: Prisma.CollectionWhereInput = {
			...notDeleted,
			OR: [
				{ name: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ slug: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ description: { contains: term, mode: Prisma.QueryMode.insensitive } },
			],
		};

		const [collections, totalCount] = await Promise.all([
			prisma.collection.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					slug: true,
					name: true,
					status: true,
					_count: { select: { products: true } },
				},
			}),
			prisma.collection.count({ where }),
		]);

		const items: AdminQuickSearchCollectionItem[] = collections.map((c) => ({
			id: c.id,
			slug: c.slug,
			name: c.name,
			status: c.status,
			productCount: c._count.products,
		}));

		return { kind: "success", items, totalCount };
	} catch (error) {
		logger.error("Admin quick search collections failed", error, {
			service: "quickSearchCollectionsAdmin",
		});
		return { kind: "error" };
	}
}
