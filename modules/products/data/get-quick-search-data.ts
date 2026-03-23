import "server-only";

import { CollectionStatus } from "@/app/generated/prisma/client";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import type {
	QuickSearchCollection,
	QuickSearchProductType,
	RecentlyViewedProduct,
} from "../components/quick-search-dialog/constants";
import { getRecentProducts } from "./get-recent-products";
import { getRecentSearches } from "./get-recent-searches";

interface QuickSearchData {
	recentSearches: string[];
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	recentlyViewed: RecentlyViewedProduct[];
}

/**
 * Fetches all data needed by the QuickSearchDialog.
 *
 * No cache on this function — underlying data functions are already cached
 * and getRecentSearches/getRecentProducts read cookies (incompatible with "use cache").
 */
export async function getQuickSearchData(): Promise<QuickSearchData> {
	const [recentSearches, collectionsData, productTypesData, recentProducts] = await Promise.all([
		getRecentSearches(),
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
		getRecentProducts({ limit: 4 }),
	]);

	const collections = collectionsData.collections.map((c) => {
		const firstImage = c.products[0]?.product.skus[0]?.images[0];
		return {
			slug: c.slug,
			name: c.name,
			productCount: c._count.products,
			image: firstImage ? { url: firstImage.url, blurDataUrl: firstImage.blurDataUrl } : null,
		};
	});

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}));

	const recentlyViewed = recentProducts.map((p) => {
		const sku = p.skus.find((s) => s.isDefault) ?? p.skus[0];
		const image = sku?.images.find((img) => img.isPrimary) ?? sku?.images[0];
		return {
			slug: p.slug,
			title: p.title,
			price: sku?.priceInclTax ?? 0,
			image: image ? { url: image.url, blurDataUrl: image.blurDataUrl } : null,
		};
	});

	return { recentSearches, collections, productTypes, recentlyViewed };
}
