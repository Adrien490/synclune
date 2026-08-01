import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getColors } from "@/modules/colors/data/get-colors";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import { getProducts } from "@/modules/products/data/get-products";
import type { Product, SortField, ProductFilters } from "@/modules/products/data/get-products";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
} from "@/modules/products/constants/product.constants";
import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { centsToEuros } from "@/shared/utils/format-euro";
import { getFirstParam } from "@/shared/utils/params";

import { SITE_URL } from "@/shared/constants/seo-config";
import { getOfferAvailability } from "@/shared/utils/offer-availability";
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
 *
 * F6 (audit Zod) : parse FAIL-SAFE — une URL forgée (`?direction=foo`,
 * cursor de longueur invalide, `perPage=99999`) retombe sur les defaults au
 * lieu de faire échouer `getProductsSchema.safeParse` dans `getProducts`
 * (throw "Invalid parameters" → 500). Le throw de `get-products.ts` reste en
 * place comme garde des appels programmatiques.
 */
export function parsePaginationParams(searchParamsData: ProductSearchParams) {
	const rawCursor = getFirstParam(searchParamsData.cursor);
	const cursorParsed = cursorSchema.safeParse(rawCursor ?? undefined);
	const cursor = cursorParsed.success ? cursorParsed.data : undefined;

	const direction = directionSchema
		.catch("forward")
		.parse(getFirstParam(searchParamsData.direction) ?? undefined);

	const rawPerPage = Number(getFirstParam(searchParamsData.perPage));
	const perPage = Number.isInteger(rawPerPage)
		? Math.min(Math.max(rawPerPage, 1), GET_PRODUCTS_MAX_RESULTS_PER_PAGE)
		: GET_PRODUCTS_DEFAULT_PER_PAGE;

	// sortBy : déjà fail-safe côté schéma (z.preprocess avec fallback dans
	// product-query.schemas.ts), pas de garde supplémentaire nécessaire.
	const sortBy = getFirstParam(searchParamsData.sortBy) ?? "created-descending";
	// Tronqué à la SSOT `TEXT_LIMITS.SEARCH` (100) — la même borne que le Zod de
	// `getProducts` et que `splitSearchTerms` : avant l'unification, un terme de
	// 101-200 chars passait le schéma (200) puis devenait « pas de recherche »
	// (splitSearchTerms → []) et rendait tout le catalogue comme « résultats ».
	const searchTerm =
		typeof searchParamsData.search === "string"
			? searchParamsData.search.slice(0, TEXT_LIMITS.SEARCH.max)
			: undefined;

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
 * Compte le nombre de filtres actifs (côté RSC : reçoit l'objet `searchParams`
 * brut + les filtres déjà parsés, et gère `excludeType` pour les pages catégorie).
 *
 * NB (audit filtres S3) : il existe un jumeau CÔTÉ CLIENT dans
 * `modules/products/services/product-filter-params.service.ts` (`countActiveFilters`,
 * signature `(URLSearchParams)`), utilisé par les composants client
 * (`product-filter-trigger`, `product-sort-bar`). Les deux doivent rester
 * cohérents : toute évolution de la logique de comptage est à répercuter ici ET là.
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
	const availability = getOfferAvailability(totalInventory > 0);

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
