import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getProductTypes } from "@/modules/product-types/data/get-product-types";
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
// STATIC GENERATION
// ============================================================================

/**
 * Génère les paramètres statiques pour toutes les pages catégorie
 * Next.js 16 avec Cache Components requiert au moins un résultat
 */
export async function generateStaticParams() {
	const { productTypes } = await getProductTypes({
		perPage: 50,
		filters: {
			isActive: true,
			hasProducts: true,
		},
	});

	if (productTypes.length === 0) {
		return [{ productTypeSlug: "__placeholder__" }];
	}

	return productTypes.map((type) => ({
		productTypeSlug: type.slug,
	}));
}

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
	const { productTypeSlug } = await params;
	const searchParamsData = await searchParams;

	// Récupérer le type de produit
	const productType = await getProductTypeBySlug({ slug: productTypeSlug });

	if (!productType) {
		return {};
	}

	// Vérifier si des filtres additionnels sont actifs (hors type)
	const hasAdditionalFilters = Object.keys(searchParamsData).some(
		(key) => !["cursor", "direction", "perPage", "sortBy", "search"].includes(key),
	);

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
		// Indexer la page catégorie, noindex si filtres additionnels
		robots: hasAdditionalFilters ? { index: false, follow: true } : undefined,
		openGraph: {
			title: `${productType.label} | Synclune`,
			description,
			url: `${SITE_URL}/produits/${productTypeSlug}`,
			type: "website",
			images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
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
	const { productTypeSlug } = await params;
	const searchParamsData = await searchParams;

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
			jsonLd={jsonLd}
			breadcrumbs={breadcrumbs}
		/>
	);
}
