import { cacheLife, cacheTag } from "next/cache";
import { SITE_URL } from "@/shared/constants/seo-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { prisma } from "@/shared/lib/prisma";
import type { MetadataRoute } from "next";

/**
 * Sitemap for product images — improves indexation in Google Images.
 * Uses Next.js standard MetadataRoute.Sitemap with images property.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

async function fetchSitemapImages() {
	"use cache";
	cacheLife("products");
	cacheTag(SHARED_CACHE_TAGS.SITEMAP_IMAGES);

	return prisma.product.findMany({
		where: {
			status: "PUBLIC",
			deletedAt: null,
		},
		select: {
			slug: true,
			updatedAt: true,
			skus: {
				where: { isActive: true },
				select: {
					images: {
						select: {
							url: true,
						},
					},
				},
			},
		},
	});
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const products = await fetchSitemapImages();

	const entries: MetadataRoute.Sitemap = [];

	for (const product of products) {
		// Collect unique image URLs across all SKUs
		const imageUrls = new Set<string>();
		for (const sku of product.skus) {
			for (const image of sku.images) {
				imageUrls.add(image.url);
			}
		}

		if (imageUrls.size > 0) {
			entries.push({
				url: `${SITE_URL}/creations/${product.slug}`,
				lastModified: new Date(product.updatedAt),
				images: Array.from(imageUrls),
			});
		}
	}

	return entries;
}
