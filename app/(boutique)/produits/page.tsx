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
import { SearchOverlay } from "@/shared/components/search-overlay";
import { SelectFilter } from "@/shared/components/select-filter";
import { SortDrawerTrigger } from "@/shared/components/sort-drawer";
import { FAB_KEYS } from "@/shared/features/fab";
import { getFabVisibility } from "@/shared/features/fab/data/get-fab-visibility";
import { getRecentSearches } from "@/shared/features/recent-searches/data/get-recent-searches";
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

/**
 * Configuration des metadata SEO par type de bijou
 */
const PRODUCT_TYPE_METADATA: Record<
	string,
	{
		title: string;
		description: string;
		keywords: string;
	}
> = {
	bagues: {
		title: "Bagues Artisanales Faites Main à Nantes | Synclune",
		description:
			"Découvrez nos bagues artisanales uniques en argent 925 et pierres naturelles. Création artisanale à Nantes. Livraison France. Chaque bague est unique.",
		keywords:
			"bagues artisanales, bagues faites main, bijoux Nantes, bague argent 925, bague pierres naturelles, bijoutier Nantes, bague unique",
	},
	colliers: {
		title: "Colliers Artisanaux Faits Main à Nantes | Synclune",
		description:
			"Colliers colorés et originaux faits main avec amour à Nantes. Argent 925 et pierres naturelles. Pièces uniques artisanales. Livraison France.",
		keywords:
			"colliers artisanaux, colliers faits main, bijoux colorés Nantes, collier argent, collier pierres naturelles, bijoutier artisan",
	},
	bracelets: {
		title: "Bracelets Artisanaux Faits Main à Nantes | Synclune",
		description:
			"Bracelets artisanaux uniques créés à Nantes. Argent 925 et pierres naturelles colorées. Création artisanale française. Livraison rapide.",
		keywords:
			"bracelets artisanaux, bracelets faits main, bijoux Nantes, bracelet argent, bracelet pierres, bijoutier Nantes, bracelet unique",
	},
	"boucles-d-oreilles": {
		title: "Boucles d'Oreilles Artisanales Nantes | Synclune",
		description:
			"Boucles d'oreilles artisanales colorées et originales. Créations uniques en argent 925 à Nantes. Bijoux faits main avec pierres naturelles.",
		keywords:
			"boucles d'oreilles artisanales, boucles oreilles faites main, bijoux Nantes, boucles argent, bijoutier artisan Nantes",
	},
};

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
 * Génère les metadata dynamiques selon le type de produit
 */
export async function generateMetadata({
	searchParams,
}: BijouxPageProps): Promise<Metadata> {
	const searchParamsData = await searchParams;
	const typeParam = getFirstParam(searchParamsData.type);

	// Vérifier si des filtres sont actifs (hors navigation et type)
	const hasActiveFilters = Object.keys(searchParamsData).some(
		(key) =>
			![
				"cursor",
				"direction",
				"perPage",
				"sortBy",
				"search",
				"type",
				"filter_sortBy",
			].includes(key)
	);

	// Si un type est spécifié et a une config SEO
	if (typeParam && PRODUCT_TYPE_METADATA[typeParam]) {
		const config = PRODUCT_TYPE_METADATA[typeParam];
		return {
			title: config.title,
			description: config.description,
			keywords: config.keywords,
			alternates: {
				canonical: `/produits?type=${typeParam}`,
			},
			robots: hasActiveFilters
				? { index: false, follow: true }
				: undefined,
			openGraph: {
				title: config.title,
				description: config.description,
				url: `https://synclune.fr/produits?type=${typeParam}`,
				type: "website",
			},
			twitter: {
				card: "summary_large_image",
				title: config.title,
				description: config.description,
			},
		};
	}

	// Metadata par défaut pour la page hub
	return {
		title: DEFAULT_METADATA.title,
		description: DEFAULT_METADATA.description,
		keywords: DEFAULT_METADATA.keywords,
		alternates: {
			canonical: "/produits",
		},
		robots: hasActiveFilters
			? { index: false, follow: true }
			: undefined,
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

	// Identifier le type sélectionné (si présent)
	const typeParam = getFirstParam(searchParamsData.type);
	const selectedProductType = typeParam
		? productTypes.find((t) => t.slug === typeParam)
		: undefined;

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

	// Parser les filtres (avec ou sans type forcé)
	const baseFilters = parseFilters(searchParamsData);
	const filters = selectedProductType
		? { ...baseFilters, type: selectedProductType.slug }
		: baseFilters;

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

	// Configuration dynamique selon le mode (hub ou type)
	const isTypePage = !!selectedProductType;
	const pageTitle = searchTerm
		? `Recherche "${searchTerm}"`
		: isTypePage
			? selectedProductType.label
			: "Les créations";
	const pageDescription = isTypePage
		? selectedProductType.description || undefined
		: "Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !";
	const searchPlaceholder = isTypePage
		? `Rechercher des ${selectedProductType.label.toLowerCase()}...`
		: "Rechercher des bijoux...";
	// Breadcrumbs
	const breadcrumbs = isTypePage
		? [
				{ label: "Bijoux", href: "/produits" },
				{
					label: selectedProductType.label,
					href: `/produits?type=${selectedProductType.slug}`,
				},
			]
		: [{ label: "Bijoux", href: "/produits" }];

	// Sort options for mobile drawer
	const sortOptions = Object.values(SORT_OPTIONS).map((option) => ({
		value: option,
		label: SORT_LABELS[option as keyof typeof SORT_LABELS],
	}));

	// JSON-LD structured data pour SEO
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: isTypePage
			? selectedProductType.label
			: "Bijoux artisanaux faits main",
		description: isTypePage
			? selectedProductType.description ||
				`Découvrez nos ${selectedProductType.label.toLowerCase()} faits main à Nantes`
			: "Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !",
		url: isTypePage
			? `https://synclune.fr/produits?type=${selectedProductType.slug}`
			: "https://synclune.fr/produits",
		breadcrumb: {
			"@type": "BreadcrumbList",
			itemListElement: isTypePage
				? [
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
							name: selectedProductType.label,
						},
					]
				: [
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
						<SortDrawerTrigger options={sortOptions} />
						<SearchOverlay
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
				<div className="group/container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
			<ProductFilterFab initialHidden={isFilterFabHidden} />
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
