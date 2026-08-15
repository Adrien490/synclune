import { getSitemapProducts } from "@/modules/products/data/get-sitemap-products";
import { logger } from "@/shared/lib/logger";
import { SITE_URL } from "@/shared/constants/seo-config";
import { NextResponse } from "next/server";

/**
 * Sitemap Images pour Google Images
 * Format: Google Image Sitemap Extension
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */

/**
 * Plafond Google : 1000 `<image:image>` par `<url>`. Au-delà, Google ignore le
 * surplus — on tronque explicitement et on le journalise (jamais de troncature
 * silencieuse, qui se lirait comme « tout le catalogue est couvert »).
 */
const MAX_IMAGES_PER_URL = 1000;

export async function GET() {
	let products;
	try {
		products = await getSitemapProducts();
	} catch (error) {
		// Incident DB : répondre 503 sans cache plutôt que servir un `<urlset>` vide
		// que le CDN garderait 24 h (désindexation silencieuse de Google Images).
		logger.error("sitemap-images: lecture catalogue impossible", error, {
			service: "sitemap-images",
		});
		return new NextResponse("Service Unavailable", {
			status: 503,
			headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
		});
	}

	let truncatedUrls = 0;

	// Construire le XML
	const urlEntries = products
		.map((product) => {
			// Collecter toutes les images uniques du produit (média produit, lean)
			const imageUrls = new Set<string>();
			const images: Array<{ url: string; alt: string }> = [];

			for (const image of product.media) {
				if (!imageUrls.has(image.url)) {
					imageUrls.add(image.url);
					images.push({
						url: image.url,
						alt:
							image.alt ??
							`${product.name} - ${product.type?.label ?? "Bijou artisanal"} fait main Synclune`,
					});
				}
			}

			if (images.length === 0) return null;

			const kept = images.slice(0, MAX_IMAGES_PER_URL);
			if (kept.length < images.length) truncatedUrls++;

			const imageElements = kept
				.map(
					(img) => `
      <image:image>
        <image:loc>${escapeXml(img.url)}</image:loc>
        <image:caption>${escapeXml(img.alt)}</image:caption>
        <image:title>${escapeXml(product.name)}</image:title>
      </image:image>`,
				)
				.join("");

			return `
  <url>
    <loc>${escapeXml(`${SITE_URL}/creations/${product.slug}`)}</loc>
    <lastmod>${product.updatedAt.toISOString()}</lastmod>${imageElements}
  </url>`;
		})
		.filter(Boolean)
		.join("");

	if (truncatedUrls > 0) {
		logger.warn(
			`sitemap-images: ${truncatedUrls} produit(s) tronqué(s) à ${MAX_IMAGES_PER_URL} images`,
			{
				service: "sitemap-images",
			},
		);
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urlEntries}
</urlset>`;

	return new NextResponse(xml, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "public, max-age=86400, s-maxage=86400",
		},
	});
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
		.replace(/'/g, "&apos;");
}
