import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getProductTypeBySlug } from "@/modules/product-types/data/get-product-type";
import { ProductCatalog } from "@/modules/products/components/product-catalog";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";

import { SITE_URL } from "@/shared/constants/seo-config";
import type { ProductSearchParams } from "../_utils/types";
import { parseFilters } from "../_utils/params";
import {
	getCatalogData,
	parsePaginationParams,
	fetchProducts,
	countActiveFilters,
	buildCatalogJsonLd,
} from "../_utils/catalog";

// ============================================================================
// STATIC GENERATION — volontairement absente
// ============================================================================

// Pas de `generateStaticParams` : Cache Components refuse un tableau vide
// (`EmptyGenerateStaticParamsError` fait échouer le build entier), donc aucun
// déploiement n'était possible sans type de produit actif portant des bijoux.
// Les pages catégorie sont rendues à la demande.

// ============================================================================
// TYPES
// ============================================================================

type ProductTypeCategoryPageProps = {
	params: Promise<{ productTypeSlug: string }>;
	searchParams: Promise<ProductSearchParams>;
};

// ============================================================================
// METADATA
// ============================================================================

export async function generateMetadata({
	params,
	searchParams,
}: ProductTypeCategoryPageProps): Promise<Metadata> {
	const [{ productTypeSlug }, searchParamsData] = await Promise.all([params, searchParams]);

	// Récupérer le type de produit
	const productType = await getProductTypeBySlug({ slug: productTypeSlug });

	if (!productType) {
		// `{}` faisait hériter les métadonnées racine (donc indexables) sur une page qui
		// va appeler `notFound()`. Alignement sur les branches « non trouvé » produit et
		// collection, qui posent toutes deux ce `robots`.
		return {
			title: "Catégorie non trouvée - Synclune",
			description: "Cette catégorie de bijoux n'existe pas ou n'est plus disponible.",
			robots: { index: false, follow: false },
		};
	}

	// Vérifier si des filtres additionnels sont actifs (hors type)
	const hasAdditionalFilters = Object.keys(searchParamsData).some(
		(key) => !["cursor", "direction", "perPage", "sortBy", "search"].includes(key),
	);
	// P2-2 : pages cursor noindex (duplicate content vs canonical catégorie)
	const isPaginated = !!searchParamsData.cursor;
	// Catégorie sans aucun produit visible = thin content → noindex (la page
	// reste navigable avec son état vide, mais ne doit pas être indexée)
	const isEmpty = productType._count.products === 0;
	const shouldNoindex = hasAdditionalFilters || isPaginated || isEmpty;

	const title = `${productType.label} artisanaux faits main | Synclune`;
	const description =
		productType.description ??
		`Découvrez mes ${productType.label.toLowerCase()} colorés créés à la main dans mon atelier. Pièces uniques et originales !`;

	return {
		title,
		description,
		keywords: `${productType.label.toLowerCase()}, bijoux artisanaux, bijoux faits main, créatrice bijoux, ${productType.label.toLowerCase()} colorés`,
		alternates: {
			canonical: `/produits/${productTypeSlug}`,
		},
		// Indexer la page catégorie, noindex si filtres additionnels ou pagination
		robots: shouldNoindex ? { index: false, follow: true } : undefined,
		openGraph: {
			title: `${productType.label} | Synclune`,
			description,
			url: `${SITE_URL}/produits/${productTypeSlug}`,
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: `${productType.label} | Synclune`,
			description,
		},
	};
}

// ============================================================================
// PAGE
// ============================================================================

export default async function ProductTypeCategoryPage({
	params,
	searchParams,
}: ProductTypeCategoryPageProps) {
	const [{ productTypeSlug }, searchParamsData] = await Promise.all([params, searchParams]);

	// Récupérer le type de produit et les données du catalogue en parallèle
	const [productType, catalogData] = await Promise.all([
		getProductTypeBySlug({ slug: productTypeSlug }),
		getCatalogData(),
	]);

	if (!productType) {
		notFound();
	}

	const { productTypes, colors, materials, maxPriceInEuros } = catalogData;

	// Parser les paramètres
	const { perPage, searchTerm } = parsePaginationParams(searchParamsData);
	const filters = parseFilters(searchParamsData);

	// Récupérer les produits et la wishlist en parallèle
	const productsPromise = fetchProducts(searchParamsData, {
		type: [productTypeSlug],
	});
	const wishlistProductIdsPromise = getWishlistProductIds();

	// Compter les filtres actifs (exclure le type car il vient du path)
	const activeFiltersCount = countActiveFilters(searchParamsData, filters, true);

	// Breadcrumbs
	const breadcrumbs = [
		{ label: "Créations", href: "/produits" },
		{ label: productType.label, href: `/produits/${productTypeSlug}` },
	];

	// Snapshot products pour enrichir le JSON-LD avec ItemList (rich result Product carousel).
	// Await partagé avec ProductCatalog — pas de double-fetch (même promise object).
	const productsSnapshot = await productsPromise;

	// JSON-LD
	const jsonLd = buildCatalogJsonLd({
		name: `${productType.label} artisanaux faits main`,
		description:
			productType.description ??
			`Découvrez mes ${productType.label.toLowerCase()} colorés créés à la main.`,
		url: `${SITE_URL}/produits/${productTypeSlug}`,
		breadcrumbs: [
			{ name: "Accueil", url: SITE_URL },
			{ name: "Créations", url: `${SITE_URL}/produits` },
			{ name: productType.label },
		],
		products: productsSnapshot.products,
	});

	return (
		<ProductCatalog
			productsPromise={productsPromise}
			perPage={perPage}
			searchTerm={searchTerm}
			wishlistProductIdsPromise={wishlistProductIdsPromise}
			activeProductType={{
				slug: productType.slug,
				label: productType.label,
				description: productType.description,
			}}
			productTypes={productTypes}
			colors={colors}
			materials={materials}
			maxPriceInEuros={maxPriceInEuros}
			activeFiltersCount={activeFiltersCount}
			preferOnSale={filters.onSale}
			jsonLd={jsonLd}
			breadcrumbs={breadcrumbs}
		/>
	);
}
