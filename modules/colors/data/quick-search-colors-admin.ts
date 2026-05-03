import { cacheLife, cacheTag } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { COLORS_CACHE_TAGS } from "../constants/cache";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchColorItem = {
	id: string;
	name: string;
	slug: string;
	hex: string;
	isActive: boolean;
	skusCount: number;
};

export type AdminQuickSearchColorsResult =
	| { kind: "success"; items: AdminQuickSearchColorItem[]; totalCount: number }
	| { kind: "error" };

export async function quickSearchColorsAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchColorsResult> {
	"use cache";
	cacheLife("user");
	cacheTag(COLORS_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where: Prisma.ColorWhereInput = {
			...notDeleted,
			OR: [
				{ name: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ slug: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ hex: { contains: term, mode: Prisma.QueryMode.insensitive } },
			],
		};

		const [colors, totalCount] = await Promise.all([
			prisma.color.findMany({
				where,
				orderBy: { position: "asc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					name: true,
					slug: true,
					hex: true,
					isActive: true,
					_count: { select: { skus: true } },
				},
			}),
			prisma.color.count({ where }),
		]);

		const items: AdminQuickSearchColorItem[] = colors.map((c) => ({
			id: c.id,
			name: c.name,
			slug: c.slug,
			hex: c.hex,
			isActive: c.isActive,
			skusCount: c._count.skus,
		}));

		return { kind: "success", items, totalCount };
	} catch (error) {
		logger.error("Admin quick search colors failed", error, {
			service: "quickSearchColorsAdmin",
		});
		return { kind: "error" };
	}
}
