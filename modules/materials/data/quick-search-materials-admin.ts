import { cacheLife, cacheTag } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { MATERIALS_CACHE_TAGS } from "../constants/cache";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchMaterialItem = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	isActive: boolean;
	skusCount: number;
};

export type AdminQuickSearchMaterialsResult =
	| { kind: "success"; items: AdminQuickSearchMaterialItem[]; totalCount: number }
	| { kind: "error" };

export async function quickSearchMaterialsAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchMaterialsResult> {
	"use cache";
	cacheLife("user");
	cacheTag(MATERIALS_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where: Prisma.MaterialWhereInput = {
			...notDeleted,
			OR: [
				{ name: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ slug: { contains: term, mode: Prisma.QueryMode.insensitive } },
			],
		};

		const [materials, totalCount] = await Promise.all([
			prisma.material.findMany({
				where,
				orderBy: { name: "asc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					isActive: true,
					_count: { select: { skus: { where: { isActive: true } } } },
				},
			}),
			prisma.material.count({ where }),
		]);

		const items: AdminQuickSearchMaterialItem[] = materials.map((m) => ({
			id: m.id,
			name: m.name,
			slug: m.slug,
			description: m.description,
			isActive: m.isActive,
			skusCount: m._count.skus,
		}));

		return { kind: "success", items, totalCount };
	} catch (error) {
		logger.error("Admin quick search materials failed", error, {
			service: "quickSearchMaterialsAdmin",
		});
		return { kind: "error" };
	}
}
