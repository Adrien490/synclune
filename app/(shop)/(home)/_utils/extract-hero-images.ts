import { getPrimaryImageForList } from "@/modules/products/services/product-display.service";
import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import type { Product } from "@/modules/products/data/get-products";

export interface HeroProductImage {
	url: string;
	alt: string;
	blurDataUrl?: string;
	slug: string;
	title: string;
}

/**
 * Extract hero-worthy images from the latest products.
 *
 * Filters out products using the SVG fallback placeholder and returns
 * at most 4 images. Returns [] if fewer than 2 real images are found
 * so the hero falls back to the text-only layout.
 */
export function extractHeroImages(products: Product[]): HeroProductImage[] {
	const images: HeroProductImage[] = [];

	for (const product of products) {
		if (images.length >= 4) break;

		const primaryImage = getPrimaryImageForList(product);

		// Skip fallback placeholder images
		if (primaryImage.id === FALLBACK_PRODUCT_IMAGE.id) continue;

		images.push({
			url: primaryImage.url,
			alt: primaryImage.alt ?? product.title,
			blurDataUrl: primaryImage.blurDataUrl,
			slug: product.slug,
			title: product.title,
		});
	}

	// Need all 4 images for the diamond layout to look balanced
	if (images.length < 4) return [];

	return images;
}
