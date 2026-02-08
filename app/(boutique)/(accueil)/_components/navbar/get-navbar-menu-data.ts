import { CollectionStatus } from "@/app/generated/prisma/client"
import { getCollections } from "@/modules/collections/data/get-collections"
import { getProductTypes } from "@/modules/product-types/data/get-product-types"
import { cacheLife, cacheTag } from "next/cache"

/**
 * Cached public menu data (collections and product types).
 * Shared between Navbar and @quicksearch parallel route.
 */
export async function getNavbarMenuData() {
	"use cache";
	cacheLife("collections");
	cacheTag("navbar-menu");

	const [collectionsData, productTypesData] = await Promise.all([
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

	return { collectionsData, productTypesData };
}
