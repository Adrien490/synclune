import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getProductTypeBySlug } from "@/modules/product-types/data/get-product-type";
import { ProductCatalog } from "@/modules/products/components/product-catalog";

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
		(key) =>
			!["cursor", "direction", "perPage", "sortBy", "search"].includes(key)
	);

	const title = `${productType.label} artisanaux faits main | Synclune - Nantes`;
	const description =
		productType.description ||
		`Découvrez mes ${productType.label.toLowerCase()} colorés créés à la main dans mon atelier nantais. Pièces uniques et originales !`;

	return {
		title,
		description,
		keywords: `${productType.label.toLowerCase()}, bijoux artisanaux, bijoux faits main, bijoutier Nantes, ${productType.label.toLowerCase()} colorés`,
		alternates: {
			canonical: `/produits/${productTypeSlug}`,
		},
		// Indexer la page catégorie, noindex si filtres additionnels
		robots: hasAdditionalFilters ? { index: false, follow: true } : undefined,
		openGraph: {
			title: `${productType.label} | Synclune`,
			description,
			url: `https://synclune.fr/produits/${productTypeSlug}`,
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
	const { productTypeSlug } = await params;
	const searchParamsData = await searchParams;

	// Récupérer le type de produit
	const productType = await getProductTypeBySlug({ slug: productTypeSlug });

	if (!productType) {
		notFound();
	}

	// Récupérer les données du catalogue
	const { productTypes, colors, materials, maxPriceInEuros } =
		await getCatalogData();

	// Parser les paramètres
	const { perPage, searchTerm } = parsePaginationParams(searchParamsData);
	const filters = parseFilters(searchParamsData);

	// Récupérer les produits avec le type pré-filtré
	const productsPromise = fetchProducts(searchParamsData, {
		type: [productTypeSlug],
	});

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
			productType.description ||
			`Découvrez mes ${productType.label.toLowerCase()} colorés créés à la main.`,
		url: `https://synclune.fr/produits/${productTypeSlug}`,
		breadcrumbs: [
			{ name: "Accueil", url: "https://synclune.fr" },
			{ name: "Créations", url: "https://synclune.fr/produits" },
			{ name: productType.label },
		],
	});

	return (
		<ProductCatalog
			productsPromise={productsPromise}
			perPage={perPage}
			searchTerm={searchTerm}
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
