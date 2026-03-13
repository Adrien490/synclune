import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { cacheFaqList } from "../constants/cache";
import type { FaqListItem } from "../types/content.types";

/**
 * Get all FAQ items for admin list, ordered by position.
 */
export async function getAdminFaqItems(): Promise<FaqListItem[]> {
	return fetchAdminFaqItems();
}

async function fetchAdminFaqItems(): Promise<FaqListItem[]> {
	"use cache";
	cacheFaqList();

	try {
		const items = await prisma.faqItem.findMany({
			select: {
				id: true,
				question: true,
				answer: true,
				links: true,
				position: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: { position: "asc" },
		});

		return items.map((item) => ({
			...item,
			links: item.links as FaqListItem["links"],
		}));
	} catch (err) {
		logger.error("Failed to fetch admin FAQ items", err, {
			service: "fetchAdminFaqItems",
		});
		return [];
	}
}
