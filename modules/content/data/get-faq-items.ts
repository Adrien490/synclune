import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { cacheFaqPublic } from "../constants/cache";
import type { FaqItemPublic } from "../types/content.types";

/**
 * Get active FAQ items for storefront display, ordered by position.
 */
export async function getFaqItems(): Promise<FaqItemPublic[]> {
	return fetchFaqItems();
}

async function fetchFaqItems(): Promise<FaqItemPublic[]> {
	"use cache";
	cacheFaqPublic();

	try {
		const items = await prisma.faqItem.findMany({
			where: { isActive: true },
			select: {
				question: true,
				answer: true,
				links: true,
			},
			orderBy: { position: "asc" },
		});

		return items.map((item) => ({
			question: item.question,
			answer: item.answer,
			links: item.links as FaqItemPublic["links"],
		}));
	} catch (err) {
		logger.error("Failed to fetch FAQ items", err, {
			service: "fetchFaqItems",
		});
		return [];
	}
}
