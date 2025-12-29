import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getColors } from "@/modules/colors/data/get-colors";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import { getProducts } from "@/modules/products/data/get-products";
import type { SortField, ProductFilters } from "@/modules/products/data/get-products";
import { GET_PRODUCTS_DEFAULT_PER_PAGE } from "@/modules/products/constants/product.constants";
import { centsToEuros } from "@/shared/utils/format-euro";
import { getFirstParam } from "@/shared/utils/params";

import { parseFilters } from "./params";
import type { ProductSearchParams } from "./types";

// ============================================================================
// SHARED DATA FETCHING
// ============================================================================

/**
 * Récupère toutes les données nécessaires au catalogue produits
 */
export async function getCatalogData() {
	const [productTypesData, colorsData, materials, maxPriceInCents] =
		await Promise.all([
			getProductTypes({
				perPage: 50,
				sortBy: "label-ascending",
				filters: {
					isActive: true,
					hasProducts: true,
				},
			}),
			getColors({
				perPage: 100,
				sortBy: "name-ascending",
			}),
			getMaterialOptions(),
			getMaxProductPrice(),
		]);

	return {
		productTypes: productTypesData.productTypes,
		colors: colorsData.colors,
		materials,
		maxPriceInEuros: centsToEuros(maxPriceInCents),
	};
}

/**
 * Parse les paramètres de pagination et tri depuis les searchParams
 */
export function parsePaginationParams(searchParamsData: ProductSearchParams) {
	const cursor = getFirstParam(searchParamsData.cursor);
	const direction = (getFirstParam(searchParamsData.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage =
		Number(getFirstParam(searchParamsData.perPage)) ||
		GET_PRODUCTS_DEFAULT_PER_PAGE;
	const sortBy = getFirstParam(searchParamsData.sortBy) || "created-descending";
	const searchTerm =
		typeof searchParamsData.search === "string"
			? searchParamsData.search
			: undefined;

	return { cursor, direction, perPage, sortBy, searchTerm };
}

/**
 * Récupère les produits avec les filtres appliqués
 */
export function fetchProducts(
	searchParamsData: ProductSearchParams,
	additionalFilters?: Partial<ProductFilters>
) {
	const { cursor, direction, perPage, sortBy, searchTerm } =
		parsePaginationParams(searchParamsData);
	const filters = parseFilters(searchParamsData);

	// Merge additional filters (ex: type from path segment)
	const mergedFilters = { ...filters, ...additionalFilters };

	return getProducts({
		cursor,
		direction,
		perPage,
		sortBy: sortBy as SortField,
		search: searchTerm,
		filters: mergedFilters,
	});
}

/**
 * Compte le nombre de filtres actifs
 */
export function countActiveFilters(
	searchParamsData: ProductSearchParams,
	filters: ProductFilters,
	excludeType = false
): number {
	let count = 0;

	// Types de produits (sauf si on est sur une page catégorie)
	if (!excludeType && searchParamsData.type) {
		count += Array.isArray(searchParamsData.type)
			? searchParamsData.type.length
			: 1;
	}

	// Couleurs
	if (filters.color && filters.color.length > 0) {
		count += filters.color.length;
	}

	// Matériaux
	if (filters.material && filters.material.length > 0) {
		count += filters.material.length;
	}

	// Prix
	if (searchParamsData.priceMin || searchParamsData.priceMax) {
		count += 1;
	}

	// Notes clients
	if (filters.ratingMin !== undefined) {
		count += 1;
	}

	return count;
}

// ============================================================================
// JSON-LD BUILDERS
// ============================================================================

type JsonLdOptions = {
	name: string;
	description: string;
	url: string;
	breadcrumbs: Array<{ name: string; url?: string }>;
};

/**
 * Génère le JSON-LD pour une page catalogue
 */
export function buildCatalogJsonLd({ name, description, url, breadcrumbs }: JsonLdOptions) {
	return {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name,
		description,
		url,
		breadcrumb: {
			"@type": "BreadcrumbList",
			itemListElement: breadcrumbs.map((item, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: item.name,
				...(item.url ? { item: item.url } : {}),
			})),
		},
		publisher: {
			"@type": "Organization",
			name: "Synclune",
			url: "https://synclune.fr",
		},
	};
}
