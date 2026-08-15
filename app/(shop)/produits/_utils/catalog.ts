import { notFound } from "next/navigation";

import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getProductTypeBySlug } from "@/modules/product-types/data/get-product-type";
import { getColors } from "@/modules/colors/data/get-colors";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import { getProducts } from "@/modules/products/data/get-products";
import { pickPrimaryImage } from "@/modules/products/services/product-display.service";
import type { Product, SortField, ProductFilters } from "@/modules/products/data/get-products";
import type {
	ActiveProductType,
	CatalogBreadcrumb,
	CatalogListProps,
} from "@/modules/products/types/catalog-shell.types";
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

// ============================================================================
// RÉSOLVEURS — lisent l'URL SANS que l'appelant l'attende
// ============================================================================

/**
 * Pourquoi ces quatre fonctions existent, alors que les pages savaient déjà
 * faire tout ça en ligne.
 *
 * Sous `cacheComponents`, un `await searchParams` (ou `await params`) au niveau
 * supérieur d'une page la rend **entièrement dynamique** : son App Shell — ce
 * que Next peint instantanément à la navigation — se réduit alors au squelette
 * PLEINE PAGE de `loading.tsx`. C'est ce qui donnait l'impression que la page se
 * rechargeait dès qu'on cochait un type, puisque ce filtre-là change de path.
 *
 * Chaque résolveur est une fonction `async` **appelée sans `await`** : elle rend
 * une promesse immédiatement, la page reste prérendable, et la lecture d'URL se
 * produit dans l'enfant suspendu qui consomme la promesse. C'est le motif
 * « push down » de la doc Next (`guides/instant-navigation`, § *Fixing a
 * navigation that blocks*).
 *
 * ⚠️ Ne jamais awaiter un de ces retours dans une `page.tsx` : ça referme
 * exactement la coquille qu'ils ouvrent.
 */

/** Le catalogue courant, type du PATH fusionné quand `params` est fourni. */
export async function resolveCatalogProducts(
	searchParams: Promise<ProductSearchParams>,
	params?: Promise<{ productTypeSlug: string }>,
) {
	const [searchParamsData, pathParams] = await Promise.all([searchParams, params]);

	return fetchProducts(
		searchParamsData,
		pathParams ? { type: [pathParams.productTypeSlug] } : undefined,
	);
}

/**
 * Tri, filtres, taille de page et terme recherché — la grille et le bloc titre
 * partagent cette seule promesse.
 *
 * ⚠️ `filters` porte le type du PATH déjà FUSIONNÉ : le load-more mobile reçoit
 * les filtres par prop, et la version nue lui ferait paginer tout le catalogue
 * depuis une page catégorie (@regression catalog-loadmore-filter-parity).
 */
export async function resolveCatalogListProps(
	searchParams: Promise<ProductSearchParams>,
	params?: Promise<{ productTypeSlug: string }>,
): Promise<CatalogListProps> {
	const [searchParamsData, pathParams] = await Promise.all([searchParams, params]);

	const { perPage, searchTerm, sortBy } = parsePaginationParams(searchParamsData);
	const filters = parseFilters(searchParamsData);

	return {
		perPage,
		searchTerm,
		sortBy: sortBy as SortField,
		filters: pathParams ? { ...filters, type: [pathParams.productTypeSlug] } : filters,
	};
}

/**
 * Le type de la page catégorie. `notFound()` ici plutôt qu'en tête de page :
 * l'existence du slug est une lecture d'URL comme une autre.
 *
 * ⚠️ Conséquence assumée — sur un slug inexistant, le `not-found` arrive APRÈS
 * le début du stream, donc en HTTP 200 sur une visite directe. Rien
 * d'indexable n'est créé pour autant : `generateMetadata` pose déjà
 * `robots: { index: false, follow: false }` sur cette branche, et aucune URL de
 * ce genre n'est liée nulle part.
 */
export async function resolveActiveProductType(
	params: Promise<{ productTypeSlug: string }>,
): Promise<ActiveProductType> {
	const { productTypeSlug } = await params;
	const productType = await getProductTypeBySlug({ slug: productTypeSlug });

	if (!productType) {
		notFound();
	}

	return {
		slug: productType.slug,
		label: productType.label,
		description: null,
	};
}

/** Fil d'Ariane de la page catégorie — son second maillon porte le libellé du type. */
export async function resolveCategoryBreadcrumbs(
	activeProductTypePromise: Promise<ActiveProductType>,
): Promise<CatalogBreadcrumb[]> {
	const { slug, label } = await activeProductTypePromise;

	return [
		{ label: "Créations", href: "/produits" },
		{ label, href: `/produits/${slug}` },
	];
}

/**
 * Récupère les produits avec les filtres appliqués
 */
function fetchProducts(
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
	// Schéma lean : le média vit sur le PRODUIT ; le choix passe par la SSOT
	// pickPrimaryImage (première IMAGE).
	const defaultVariant = product.variants[0];
	const primaryImage = pickPrimaryImage(product.media);

	const totalStock = product.variants.reduce(
		(sum, variant) => (variant.active ? sum + variant.stock : sum),
		0,
	);
	const availability = getOfferAvailability(totalStock > 0);

	return {
		"@type": "Product",
		name: product.name,
		url: `${SITE_URL}/creations/${product.slug}`,
		...(primaryImage && { image: primaryImage.url }),
		...(product.description && { description: product.description }),
		brand: { "@type": "Brand", name: "Synclune" },
		...(defaultVariant && {
			offers: {
				"@type": "Offer",
				price: ((defaultVariant.priceCents ?? product.priceCents) / 100).toFixed(2),
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
