import type { ProductSearchParams } from "../page";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { TabNavigation } from "@/shared/components/tab-navigation";
import { getColors } from "@/modules/colors/data/get-colors";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { ProductFilterBadges } from "@/modules/products/components/filter-badges";
import { ProductFilterSheet } from "@/modules/products/components/product-filter-sheet";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import { centsToEuros } from "@/shared/utils/format-euro";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	SORT_LABELS,
	SORT_OPTIONS,
} from "@/modules/products/data/get-products";
import { getProducts } from "@/modules/products/data/get-products";
import type { SortField } from "@/modules/products/data/get-products";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parseFilters } from "../_utils/params";
import { generateProductTypeMetadata } from "./_utils/generate-metadata";

type BijouxPageProps = {
	params: Promise<{ productTypeSlug: string }>;
	searchParams: Promise<ProductSearchParams>;
};

export default async function BijouxPage({
	params,
	searchParams,
}: BijouxPageProps) {
	const { productTypeSlug } = await params;
	const searchParamsData = await searchParams;

	// Récupérer le type de produit
	const productTypesData = await getProductTypes({
		perPage: 100,
		sortBy: "label-ascending",
		filters: {
			isActive: true,
		},
	});

	const productType = productTypesData.productTypes.find(
		(t) => t.slug === productTypeSlug
	);

	// 404 si le type n'existe pas
	if (!productType) {
		notFound();
	}

	// Extraction du terme de recherche
	const searchTerm =
		typeof searchParamsData.search === "string"
			? searchParamsData.search
			: undefined;

	// Récupérer les couleurs, matériaux et le prix maximum
	const [colorsData, materials, maxPriceInCents] = await Promise.all([
		getColors({
			perPage: 100,
			sortBy: "name-ascending",
		}),
		getMaterialOptions(),
		getMaxProductPrice(),
	]);

	// Conversion en euros côté UI (la DAL retourne des centimes)
	const maxPriceInEuros = centsToEuros(maxPriceInCents);

	const colors = colorsData.colors;

	// Helper pour extraire les paramètres
	const getFirstParam = (
		param: string | string[] | undefined
	): string | undefined => {
		if (Array.isArray(param)) return param[0];
		return param;
	};

	// Récupérer les produits avec filtres
	const cursor = getFirstParam(searchParamsData.cursor);
	const direction = (getFirstParam(searchParamsData.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage =
		Number(getFirstParam(searchParamsData.perPage)) ||
		GET_PRODUCTS_DEFAULT_PER_PAGE;
	const sortByFromFilter = getFirstParam(searchParamsData.filter_sortBy);
	const sortByFromParam = getFirstParam(searchParamsData.sortBy);
	const sortBy = sortByFromFilter || sortByFromParam || "created-descending";

	// Parser les filtres et ajouter le filtre de type
	const filters = {
		...parseFilters(searchParamsData),
		type: productTypeSlug,
	};

	// Récupérer les produits
	const productsPromise = getProducts({
		cursor,
		direction,
		perPage,
		sortBy: sortBy as SortField,
		search: searchTerm,
		filters,
	});

	// Vérifier si des filtres sont actifs (hors navigation et type)
	const hasActiveFilters = Object.keys(searchParamsData).some(
		(key) =>
			!["cursor", "direction", "perPage", "sortBy", "search", "type"].includes(
				key
			)
	);

	// JSON-LD structured data pour SEO
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: productType.label,
		description:
			productType.description ||
			`Découvrez nos ${productType.label.toLowerCase()} artisanaux faits main à Nantes`,
		url: `https://synclune.fr/produits/${productTypeSlug}`,
		breadcrumb: {
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Accueil",
					item: "https://synclune.fr",
				},
				{
					"@type": "ListItem",
					position: 2,
					name: "Bijoux",
					item: "https://synclune.fr/produits",
				},
				{
					"@type": "ListItem",
					position: 3,
					name: productType.label,
				},
			],
		},
		publisher: {
			"@type": "Organization",
			name: "Synclune",
			url: "https://synclune.fr",
		},
	};

	return (
		<div className="min-h-screen relative">
			{/* JSON-LD Structured Data */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			<PageHeader
				title={searchTerm ? `Recherche "${searchTerm}"` : productType.label}
				description={productType.description || undefined}
				breadcrumbs={[
					{ label: "Bijoux", href: "/produits" },
					{ label: productType.label, href: `/produits/${productTypeSlug}` },
				]}
				navigation={
					<TabNavigation
						items={[
							{
								label: "Tous les bijoux",
								value: "tous",
								href: "/produits",
							},
							...productTypesData.productTypes.map((type) => ({
								label: type.label,
								value: type.slug,
								href: `/produits/${type.slug}`,
							})),
						]}
						activeValue={productTypeSlug}
						ariaLabel="Navigation par types de bijoux"
					/>
				}
			/>

			{/* Section principale avec catalogue */}
			<section className="bg-background pt-6 pb-12 lg:pt-8 lg:pb-16 relative z-10">
				<div className="group/container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					<Toolbar
						variant="compact"
						search={
							<SearchForm
								paramName="search"
								placeholder={`Rechercher des ${productType.label.toLowerCase()}...`}
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.values(SORT_OPTIONS).map((option) => ({
								value: option,
								label: SORT_LABELS[option as keyof typeof SORT_LABELS],
							}))}
							placeholder="Plus récents"
							compactMobile
							compactAriaLabel="Trier les produits"
						/>
						<ProductFilterSheet
							colors={colors}
							materials={materials}
							maxPriceInEuros={maxPriceInEuros}
						/>
					</Toolbar>

					{/* Badges des filtres actifs */}
					{hasActiveFilters && <ProductFilterBadges colors={colors} materials={materials} />}

					<Suspense fallback={<ProductListSkeleton />}>
						<ProductList productsPromise={productsPromise} perPage={perPage} />
					</Suspense>
				</div>
			</section>
		</div>
	);
}

// Export de la fonction generateMetadata depuis le fichier utilitaire
export { generateProductTypeMetadata as generateMetadata };
