import { CollectionStatus } from "@/app/generated/prisma/client";
import type { Collection } from "@/modules/collections/types/collection.types";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Extract up to 4 product images from a collection for Bento Grid display.
 */
export function extractCollectionImages(products: Collection["products"]) {
	return products
		.slice(0, 4)
		.map((p) => {
			const image = p.product.skus[0]?.images[0];
			return image ? { url: image.url, blurDataUrl: image.blurDataUrl, alt: image.altText } : null;
		})
		.filter(
			(img): img is { url: string; blurDataUrl: string | null; alt: string | null } => img !== null,
		);
}

/**
 * Cached public menu data (collections and product types).
 * Shared between Navbar and @quicksearch parallel route.
 */
export async function getNavbarMenuData() {
	"use cache";
	cacheLife("collections");
	cacheTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

	const [collectionsData, productTypesData] = await Promise.allSettled([
		getCollections({
			perPage: 4,
			sortBy: "products-descending",
			filters: { hasProducts: true, status: CollectionStatus.PUBLIC },
		}),
		getProductTypes({
			perPage: 12,
			sortBy: "label-ascending",
			filters: { isActive: true, hasProducts: true },
		}),
	]);

	if (collectionsData.status === "rejected") {
		console.error("[navbar] Failed to fetch collections:", collectionsData.reason);
	}
	if (productTypesData.status === "rejected") {
		console.error("[navbar] Failed to fetch product types:", productTypesData.reason);
	}

	return {
		collectionsData:
			collectionsData.status === "fulfilled"
				? collectionsData.value
				: { collections: [], totalCount: 0 },
		productTypesData:
			productTypesData.status === "fulfilled"
				? productTypesData.value
				: { productTypes: [], totalCount: 0 },
	};
}
