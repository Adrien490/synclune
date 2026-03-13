import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { z } from "zod";

import { cacheFaqList } from "../constants/cache";
import { faqLinkSchema } from "../schemas/faq.schemas";
import type { FaqListItem } from "../types/faq.types";

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

		const linksSchema = z.array(faqLinkSchema);

		return items.map((item) => {
			const parsed = linksSchema.safeParse(item.links);
			return {
				...item,
				links: parsed.success ? parsed.data : null,
			};
		});
	} catch (err) {
		logger.error("Failed to fetch admin FAQ items", err, {
			service: "fetchAdminFaqItems",
		});
		return [];
	}
}
