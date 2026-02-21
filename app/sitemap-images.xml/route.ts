import { prisma, notDeleted } from "@/shared/lib/prisma"
import { SITE_URL } from "@/shared/constants/seo-config"
import { NextResponse } from "next/server"

/**
 * Sitemap Images pour Google Images
 * Format: Google Image Sitemap Extension
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */
export async function GET() {
	// Récupérer tous les produits publics avec leurs SKUs et images
	const products = await prisma.product.findMany({
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
	})

	// Construire le XML
	const urlEntries = products
		.map((product) => {
			// Collecter toutes les images uniques du produit
			const imageUrls = new Set<string>()
			const images: Array<{ url: string; alt: string }> = []

			for (const sku of product.skus) {
				for (const image of sku.images) {
					if (!imageUrls.has(image.url)) {
						imageUrls.add(image.url)
						images.push({
							url: image.url,
							alt:
								image.altText ||
								`${product.title} - ${product.type?.label || "Bijou artisanal"} fait main Synclune`,
						})
					}
				}
			}

			if (images.length === 0) return null

			const imageElements = images
				.map(
					(img) => `
      <image:image>
        <image:loc>${escapeXml(img.url)}</image:loc>
        <image:caption>${escapeXml(img.alt)}</image:caption>
        <image:title>${escapeXml(product.title)}</image:title>
      </image:image>`
				)
				.join("")

			return `
  <url>
    <loc>${SITE_URL}/creations/${product.slug}</loc>${imageElements}
  </url>`
		})
		.filter(Boolean)
		.join("")

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urlEntries}
</urlset>`

	return new NextResponse(xml, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "public, max-age=86400, s-maxage=86400",
		},
	})
}

/**
 * Échappe les caractères spéciaux XML
 */
function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
}
