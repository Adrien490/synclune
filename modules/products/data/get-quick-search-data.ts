import "server-only";

import { getCollections } from "@/modules/collections/data/get-collections";
import { getColors } from "@/modules/colors/data/get-colors";
import { sortColorsByHue } from "@/modules/colors/services/sort-colors-by-hue";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import {
	QUICK_SEARCH_MAX_COLORS,
	QUICK_SEARCH_MIN_COLORS,
} from "../components/quick-search-dialog/constants";
import type {
	QuickSearchCollection,
	QuickSearchColor,
	QuickSearchProductType,
} from "../components/quick-search-dialog/constants";
import { getRecentSearches } from "./get-recent-searches";
import { slugify } from "@/shared/utils/generate-slug";

interface QuickSearchData {
	recentSearches: string[];
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	/** Vide quand le catalogue porte moins de `QUICK_SEARCH_MIN_COLORS` teintes. */
	colors: QuickSearchColor[];
}

/**
 * Fetches all data needed by the QuickSearchDialog.
 *
 * No cache on this function — underlying data functions are already cached
 * and getRecentSearches reads cookies (incompatible with "use cache").
 */
export async function getQuickSearchData(): Promise<QuickSearchData> {
	const [recentSearches, collectionsData, productTypesData, colorsData] = await Promise.all([
		getRecentSearches(),
		getCollections({
			perPage: 4,
			sortBy: "products-descending",
			filters: { hasProducts: true, active: true },
		}),
		getProductTypes({
			perPage: 12,
			sortBy: "label-ascending",
			filters: { hasProducts: true },
		}),
		// Le nuancier du panneau au repos. MÊME appel que celui du filtre de
		// /produits (`app/(shop)/produits/_utils/catalog.ts`) : le mur propose donc
		// exactement les teintes que le filtre accepte, et hérite de son cache
		// (`cacheColors()`, tag `colors-list`).
		//
		// Deux imprécisions assumées :
		// - le tri `variantCount` compte AUSSI les VARIANTs soft-deleted (contrainte Prisma
		//   documentée dans `color.constants.ts` : pas de `where` partiel sur un
		//   `_count` utilisé en `orderBy`) — le classement « les plus portées » est
		//   donc approché, ce qui est sans conséquence sur un choix de 12 ;
		// - une teinte dont plus aucun produit n'est PUBLIC mène à une PLP vide.
		//   La corriger demanderait un filtre `hasProducts` sur `Color` ET que
		//   toute mutation produit/VARIANT invalide `colors-list` (aujourd'hui seul
		//   `COLORS_CACHE_TAGS.PRODUCT_COUNT(id)` cascade) — un tag sans mutateur
		//   serait pire que le défaut qu'il corrige.
		getColors({
			perPage: QUICK_SEARCH_MAX_COLORS,
			sortBy: "variantCount-descending",
		}),
	]);

	const collections = collectionsData.collections.map((c) => {
		const firstImage = c.products[0]?.media[0];
		return {
			slug: c.slug,
			name: c.name,
			productCount: c._count.products,
			image: firstImage ? { url: firstImage.url } : null,
		};
	});

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}));

	// Le seuil s'applique AVANT le tri chromatique : sous `QUICK_SEARCH_MIN_COLORS`
	// il n'y a pas de mur à ordonner, et le panneau retombe sur son contenu textuel.
	const colors: QuickSearchColor[] =
		colorsData.colors.length >= QUICK_SEARCH_MIN_COLORS
			? sortColorsByHue(colorsData.colors).map((c) => ({
					slug: slugify(c.name),
					name: c.name,
					hex: c.hex,
				}))
			: [];

	return { recentSearches, collections, productTypes, colors };
}
