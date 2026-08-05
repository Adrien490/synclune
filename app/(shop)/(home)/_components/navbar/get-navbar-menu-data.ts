import { CollectionStatus } from "@/app/generated/prisma/client";
import type { Collection } from "@/modules/collections/types/collection.types";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypesForMenu } from "@/modules/product-types/data/get-product-types-for-menu";

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
 * Public menu data (collections and product types). Consommée par `Navbar`
 * uniquement (le parallel route @quicksearch a son propre fetch).
 *
 * ⚠️ PAS de `"use cache"` ici, et c'est voulu : `fetchCollections` et
 * `getProductTypesForMenu` sont déjà cachées chacune (profil + tags LIST
 * propres), donc un scope agrégé n'économisait qu'un lookup. Surtout, il
 * mettait en cache la valeur DÉGRADÉE : le repli vide ci-dessous — et celui du
 * wrapper de `getCollections`, conçu pour vivre hors cache — retourne
 * normalement, donc Next le figeait sous le profil `reference` (revalidate
 * 24 h). Une panne DB d'une seconde pendant un miss = menus vides jusqu'au
 * lendemain, indiscernables d'un catalogue sans collection
 * (CACHE-DEGRADED-VALUE-001). Sans scope cache, le repli ne vaut que pour la
 * requête en cours.
 *
 * `{ isAdmin: false }` : ce menu est public et n'a jamais exposé de contenu
 * admin — les filtres forcent déjà PUBLIC/actif. `getProductTypesForMenu` est
 * publique par construction et n'a pas besoin de l'option.
 */
export async function getNavbarMenuData() {
	const [collectionsData, productTypesData] = await Promise.allSettled([
		getCollections(
			{
				perPage: 3,
				sortBy: "products-descending",
				filters: { hasProducts: true, status: CollectionStatus.PUBLIC },
			},
			{ isAdmin: false },
		),
		getProductTypesForMenu(),
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
