import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getColors } from "@/modules/colors/data/get-colors";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	SORT_LABELS,
	SORT_OPTIONS,
} from "@/modules/products/constants/product.constants";
import { getProducts } from "@/modules/products/data/get-products";
import type { SortField } from "@/modules/products/data/get-products";
import { ProductFilterBadges } from "@/modules/products/components/filter-badges";
import { ProductFilterFab } from "@/modules/products/components/product-filter-fab";
import { ProductFilterSheet } from "@/modules/products/components/product-filter-sheet";
import { ProductFilterTrigger } from "@/modules/products/components/product-filter-trigger";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { MobileSearchWrapper } from "./_components/mobile-search-wrapper";
import { SelectFilter } from "@/shared/components/select-filter";
import { SortDrawerTrigger } from "@/shared/components/sort-drawer";
import { ClearSearchButton } from "@/shared/components/clear-search-button";
import { FAB_KEYS } from "@/shared/constants/fab";
import { getFabVisibility } from "@/shared/data/get-fab-visibility";
import { getRecentSearches } from "@/shared/data/get-recent-searches";
import { centsToEuros } from "@/shared/utils/format-euro";
import { getFirstParam } from "@/shared/utils/params";
import { parseFilters } from "./_utils/params";

/**
 * Product filters search params (URL parameters)
 */
export type ProductFiltersSearchParams = {
	priceMin?: string;
	priceMax?: string;
	inStock?: string;
	type?: string | string[];
	material?: string | string[];
	collectionId?: string;
	collectionSlug?: string;
};

/**
 * Complete product search params (base + filters)
 */
export type ProductSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_sortBy?: string;
} & ProductFiltersSearchParams;

const DEFAULT_METADATA = {
	title: "Tous mes bijoux colorés faits main | Synclune - Nantes",
	description:
		"Découvrez tous mes bijoux colorés créés à la main dans mon atelier nantais. Inspirations Pokémon, Van Gogh, Twilight... Chaque pièce est unique !",
	keywords:
		"bijoux artisanaux, bijoux faits main, bijoutier Nantes, bagues colliers bracelets, acier inoxydable, perles, bijoux colorés, bijoux pokemon, bijoux van gogh",
};

type BijouxPageProps = {
	searchParams: Promise<ProductSearchParams>;
};

/**
 * Génère les metadata pour la page produits
 */
export async function generateMetadata({
	searchParams,
}: BijouxPageProps): Promise<Metadata> {
	const searchParamsData = await searchParams;

	// Vérifier si des filtres sont actifs (incluant le type)
	const hasActiveFilters = Object.keys(searchParamsData).some(
		(key) =>
			![
				"cursor",
				"direction",
				"perPage",
				"sortBy",
				"search",
				"filter_sortBy",
			].includes(key)
	);

	return {
		title: DEFAULT_METADATA.title,
		description: DEFAULT_METADATA.description,
		keywords: DEFAULT_METADATA.keywords,
		alternates: {
			canonical: "/produits",
		},
		robots: hasActiveFilters ? { index: false, follow: true } : undefined,
		openGraph: {
			title: "Tous mes bijoux colorés | Synclune",
			description:
				"Bijoux artisanaux faits main à Nantes. Inspirations Pokémon, Van Gogh, Twilight... Pièces uniques créées avec passion !",
			url: "https://synclune.fr/produits",
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: "Tous mes bijoux colorés | Synclune",
			description:
				"Bijoux artisanaux faits main à Nantes. Inspirations Pokémon, Van Gogh, Twilight... Pièces uniques !",
		},
	};
}

/**
 * Page /produits
 *
 * Affiche tous les produits avec:
 * - Navigation par onglets de types (via search params)
 * - Filtres (couleur, prix, tri)
 * - Recherche
 * - Pagination
 */
export default async function BijouxPage({ searchParams }: BijouxPageProps) {
	const searchParamsData = await searchParams;

	// Récupérer tous les types de bijoux actifs
	const productTypesData = await getProductTypes({
		perPage: 50,
		sortBy: "label-ascending",
		filters: {
			isActive: true,
		},
	});
	const productTypes = productTypesData.productTypes;

	// Extraction du terme de recherche
	const searchTerm =
		typeof searchParamsData.search === "string"
			? searchParamsData.search
			: undefined;

	// Récupérer les couleurs, matériaux, prix maximum, visibilité FAB et recherches récentes en parallèle
	const [colorsData, materials, maxPriceInCents, isFilterFabHidden, recentSearches] =
		await Promise.all([
			getColors({
				perPage: 100,
				sortBy: "name-ascending",
			}),
			getMaterialOptions(),
			getMaxProductPrice(),
			getFabVisibility(FAB_KEYS.STOREFRONT),
			getRecentSearches(),
		]);

	const maxPriceInEuros = centsToEuros(maxPriceInCents);
	const colors = colorsData.colors;

	// Paramètres de pagination et tri
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

	// Parser les filtres (le type est déjà géré par parseFilters)
	const filters = parseFilters(searchParamsData);

	// Récupérer les produits
	const productsPromise = getProducts({
		cursor,
		direction,
		perPage,
		sortBy: sortBy as SortField,
		search: searchTerm,
		filters,
	});

	// Compter les filtres actifs (pour le badge FAB et hasActiveFilters)
	const activeFiltersCount = (() => {
		let count = 0;
		const params = searchParamsData;

		// Types de produits
		if (params.type) {
			count += Array.isArray(params.type) ? params.type.length : 1;
		}
		// Couleurs (via parseFilters -> filters.color)
		if (filters.color && filters.color.length > 0) {
			count += filters.color.length;
		}
		// Materiaux (via parseFilters -> filters.material)
		if (filters.material && filters.material.length > 0) {
			count += filters.material.length;
		}
		// Prix (compte comme 1 si priceMin ou priceMax defini)
		if (params.priceMin || params.priceMax) {
			count += 1;
		}

		return count;
	})();

	const hasActiveFilters = activeFiltersCount > 0;

	// Configuration de la page (valeurs fixes, les types sont des filtres)
	const pageTitle = searchTerm ? `Recherche "${searchTerm}"` : "Les créations";
	const pageDescription =
		"Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !";
	const searchPlaceholder = "Rechercher des bijoux...";
	const breadcrumbs = [{ label: "Bijoux", href: "/produits" }];

	// Sort options for mobile drawer
	const sortOptions = Object.values(SORT_OPTIONS).map((option) => ({
		value: option,
		label: SORT_LABELS[option as keyof typeof SORT_LABELS],
	}));

	// JSON-LD structured data pour SEO
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: "Bijoux artisanaux faits main",
		description: pageDescription,
		url: "https://synclune.fr/produits",
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
		<div className="min-h-screen">
			{/* JSON-LD Structured Data */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			<PageHeader
				title={pageTitle}
				description={searchTerm ? undefined : pageDescription}
				breadcrumbs={breadcrumbs}
				actions={
					<div className="flex items-center gap-2 md:hidden">
						<ClearSearchButton />
						<SortDrawerTrigger options={sortOptions} />
						<MobileSearchWrapper
							placeholder={searchPlaceholder}
							productTypes={productTypes.map((t) => ({
								slug: t.slug,
								label: t.label,
							}))}
							recentSearches={recentSearches}
						/>
					</div>
				}
			/>

		

			{/* Section principale avec catalogue */}
			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div
					id="product-container"
					className="group/container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
				>
					{/* Desktop Toolbar - hidden on mobile */}
					<Toolbar
						className="hidden md:flex"
						search={
							<SearchForm
								paramName="search"
								placeholder={searchPlaceholder}
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
						/>
						<ProductFilterTrigger />
					</Toolbar>

					{hasActiveFilters && (
						<ProductFilterBadges colors={colors} materials={materials} />
					)}

					<Suspense fallback={<ProductListSkeleton />}>
						<ProductList productsPromise={productsPromise} perPage={perPage} />
					</Suspense>
				</div>
			</section>

			{/* FAB Filtres - Mobile only */}
			<ProductFilterFab
				initialHidden={isFilterFabHidden}
				activeFiltersCount={activeFiltersCount}
			/>
			<ProductFilterSheet
				colors={colors}
				materials={materials}
				productTypes={productTypes.map((t) => ({
					slug: t.slug,
					label: t.label,
				}))}
				maxPriceInEuros={maxPriceInEuros}
			/>
		</div>
	);
}
