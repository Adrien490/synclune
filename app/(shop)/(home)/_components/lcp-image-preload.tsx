import { getPrimaryImageForList } from "@/modules/products/services/product-display.service";
import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { IMAGE_SIZES } from "@/modules/products/constants/product-texts.constants";
import type { GetProductsReturn } from "@/modules/products/data/get-products";

/**
 * Injects a `<link rel="preload">` for the first product card image.
 *
 * Rendered OUTSIDE Suspense boundaries so the preload hint appears in
 * the initial HTML shell, letting the browser discover the LCP image
 * before the LatestCreations Suspense boundary resolves.
 */
export async function LCPImagePreload({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const { products } = await productsPromise;

	const firstProduct = products[0];
	if (!firstProduct) return null;

	const primaryImage = getPrimaryImageForList(firstProduct);
	if (primaryImage.id === FALLBACK_PRODUCT_IMAGE.id) return null;

	// Build the Next.js optimized image URL for the preload hint
	const encodedUrl = encodeURIComponent(primaryImage.url);
	const srcSet = [256, 384, 640]
		.map((w) => `/_next/image?url=${encodedUrl}&w=${w}&q=80 ${w}w`)
		.join(", ");

	return (
		<link
			rel="preload"
			as="image"
			imageSrcSet={srcSet}
			imageSizes={IMAGE_SIZES.PRODUCT_CARD}
			fetchPriority="high"
		/>
	);
}
