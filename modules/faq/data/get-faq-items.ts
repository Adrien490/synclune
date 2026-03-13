import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { cacheFaqPublic } from "../constants/cache";
import { faqLinkSchema } from "../schemas/faq.schemas";
import type { FaqItemPublic } from "../types/faq.types";
import { z } from "zod";

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

		const linksSchema = z.array(faqLinkSchema);

		return items.map((item) => {
			const parsed = linksSchema.safeParse(item.links);
			return {
				question: item.question,
				answer: item.answer,
				links: parsed.success ? parsed.data : null,
			};
		});
	} catch (err) {
		logger.error("Failed to fetch FAQ items", err, {
			service: "fetchFaqItems",
		});
		return [];
	}
}
