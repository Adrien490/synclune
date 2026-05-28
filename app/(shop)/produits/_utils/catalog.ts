import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getColors } from "@/modules/colors/data/get-colors";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import { getProducts } from "@/modules/products/data/get-products";
import type { Product, SortField, ProductFilters } from "@/modules/products/data/get-products";
import { GET_PRODUCTS_DEFAULT_PER_PAGE } from "@/modules/products/constants/product.constants";
import { centsToEuros } from "@/shared/utils/format-euro";
import { getFirstParam } from "@/shared/utils/params";

import { SITE_URL } from "@/shared/constants/seo-config";
import { parseFilters } from "./params";
import type { ProductSearchParams } from "./types";

const CATALOG_JSON_LD_MAX_ITEMS = 30;

// ============================================================================
// SHARED DATA FETCHING
// ============================================================================

/**
 * Récupère toutes les données nécessaires au catalogue produits
 */
export async function getCatalogData() {
	const [productTypesData, colorsData, materials, maxPriceInCents] = await Promise.all([
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
			filters: { isActive: true },
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
	const direction = (getFirstParam(searchParamsData.direction) ?? "forward") as
		| "forward"
		| "backward";
	const perPage = Number(getFirstParam(searchParamsData.perPage)) || GET_PRODUCTS_DEFAULT_PER_PAGE;
	const sortBy = getFirstParam(searchParamsData.sortBy) ?? "created-descending";
	const searchTerm =
		typeof searchParamsData.search === "string" ? searchParamsData.search.slice(0, 200) : undefined;

	return { cursor, direction, perPage, sortBy, searchTerm };
}

/**
 * Récupère les produits avec les filtres appliqués
 */
export function fetchProducts(
	searchParamsData: ProductSearchParams,
	additionalFilters?: Partial<ProductFilters>,
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
	excludeType = false,
): number {
	let count = 0;

	// Types de produits (sauf si on est sur une page catégorie)
	if (!excludeType && searchParamsData.type) {
		count += Array.isArray(searchParamsData.type) ? searchParamsData.type.length : 1;
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

	// Promotions
	if (filters.onSale) {
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
	/**
	 * Snapshot des produits affichés (max 30 sérialisés en ItemList pour rich result
	 * "Product carousel" — Google ignore au-delà de ~25-30 items). Optionnel : si absent,
	 * le JSON-LD reste un CollectionPage + BreadcrumbList sans mainEntity.
	 */
	products?: ReadonlyArray<Product>;
};

function buildItemListProduct(product: Product) {
	const defaultSku = product.skus[0];
	const primaryImage =
		defaultSku?.images.find((img) => img.isPrimary && img.mediaType === "IMAGE") ??
		defaultSku?.images.find((img) => img.mediaType === "IMAGE");

	const totalInventory = product.skus.reduce(
		(sum, sku) => (sku.isActive ? sum + sku.inventory : sum),
		0,
	);
	const availability =
		totalInventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

	return {
		"@type": "Product",
		name: product.title,
		url: `${SITE_URL}/creations/${product.slug}`,
		...(primaryImage && { image: primaryImage.url }),
		...(product.description && { description: product.description }),
		brand: { "@type": "Brand", name: "Synclune" },
		...(defaultSku && {
			offers: {
				"@type": "Offer",
				price: (defaultSku.priceInclTax / 100).toFixed(2),
				priceCurrency: "EUR",
				availability,
				url: `${SITE_URL}/creations/${product.slug}`,
				itemCondition: "https://schema.org/NewCondition",
			},
		}),
	};
}

/**
 * Génère le JSON-LD pour une page catalogue
 */
export function buildCatalogJsonLd({
	name,
	description,
	url,
	breadcrumbs,
	products,
}: JsonLdOptions) {
	const itemListProducts = products?.slice(0, CATALOG_JSON_LD_MAX_ITEMS);

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
		...(itemListProducts &&
			itemListProducts.length > 0 && {
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: itemListProducts.length,
					itemListElement: itemListProducts.map((product, index) => ({
						"@type": "ListItem",
						position: index + 1,
						item: buildItemListProduct(product),
					})),
				},
			}),
		publisher: {
			"@type": "Organization",
			name: "Synclune",
			url: SITE_URL,
		},
	};
}
