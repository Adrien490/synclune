import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypesForMenu } from "@/modules/product-types/data/get-product-types-for-menu";

// Plus d'`extractCollectionImages` local (harmonisation 2026-08-06) : la SSOT
// est `modules/collections/utils/collection-images.utils.ts` (dédup par
// productId), consommée par `navbar.tsx` — les deux homonymes pouvaient faire
// diverger la cover d'une même collection entre le menu et la landing.

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
				filters: { hasProducts: true, active: true },
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
