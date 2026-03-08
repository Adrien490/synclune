import { cacheLife, cacheTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Fetches public products with their SKU images for the image sitemap.
 * Cached with the sitemap-images tag for targeted invalidation.
 */
export async function getSitemapProducts() {
	"use cache";
	cacheLife("collections");
	cacheTag(SHARED_CACHE_TAGS.SITEMAP_IMAGES);

	try {
		return await prisma.product.findMany({
			where: {
				status: "PUBLIC",
				...notDeleted,
			},
			select: {
				slug: true,
				title: true,
				type: {
					select: {
						label: true,
					},
				},
				skus: {
					where: {
						isActive: true,
						deletedAt: null,
					},
					select: {
						images: {
							where: {
								mediaType: "IMAGE",
							},
							select: {
								url: true,
								altText: true,
								isPrimary: true,
							},
							orderBy: {
								position: "asc",
							},
						},
					},
				},
			},
		});
	} catch (error) {
		logger.error("Failed to fetch sitemap products", error, { service: "getSitemapProducts" });
		return [];
	}
}
