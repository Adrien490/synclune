import { SITE_URL } from "@/shared/constants/seo-config";
import { prisma } from "@/shared/lib/prisma";

/**
 * Sitemap dédié aux images pour améliorer l'indexation dans Google Images
 * Suit le format Google Image Sitemap Extension
 * https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */

interface ImageEntry {
	loc: string;
	title?: string;
	caption?: string;
}

interface SitemapImageEntry {
	url: string;
	lastModified: Date;
	images: ImageEntry[];
}

export default async function sitemap(): Promise<SitemapImageEntry[]> {
	// Récupérer tous les produits publics avec leurs images
	const products = await prisma.product.findMany({
		where: {
			status: "PUBLIC",
			deletedAt: null,
		},
		select: {
			slug: true,
			title: true,
			updatedAt: true,
			type: {
				select: {
					label: true,
				},
			},
			skus: {
				where: { isActive: true },
				select: {
					images: {
						select: {
							url: true,
							altText: true,
						},
					},
					color: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	// Construire les entrées du sitemap images
	const entries: SitemapImageEntry[] = [];

	for (const product of products) {
		// Collecter toutes les images uniques du produit
		const imageMap = new Map<string, ImageEntry>();

		for (const sku of product.skus) {
			for (const image of sku.images) {
				if (!imageMap.has(image.url)) {
					const colorName = sku.color?.name;
					const typeName = product.type?.label;

					// Titre descriptif pour le SEO
					const title = [product.title, colorName, typeName]
						.filter(Boolean)
						.join(" - ");

					// Caption avec contexte
					const caption =
						image.altText ||
						`${product.title}${colorName ? ` - ${colorName}` : ""} - Bijou artisanal fait main Synclune Nantes`;

					imageMap.set(image.url, {
						loc: image.url,
						title,
						caption,
					});
				}
			}
		}

		// Ajouter l'entrée seulement si le produit a des images
		if (imageMap.size > 0) {
			entries.push({
				url: `${SITE_URL}/creations/${product.slug}`,
				lastModified: new Date(product.updatedAt),
				images: Array.from(imageMap.values()),
			});
		}
	}

	return entries;
}
