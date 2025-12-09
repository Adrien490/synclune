import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { TabNavigation } from "@/shared/components/tab-navigation";
import { getColors } from "@/modules/colors/data/get-colors";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { ProductFilterBadges } from "@/modules/products/components/filter-badges";
import { ProductFilterSheet } from "@/modules/products/components/product-filter-sheet";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import { centsToEuros } from "@/shared/utils/format-euro";
import { getFirstParam } from "@/shared/utils/params";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	SORT_LABELS,
	SORT_OPTIONS,
	getProducts,
} from "@/modules/products/data/get-products";
import type { SortField } from "@/modules/products/data/get-products";
import { Suspense } from "react";
import { parseFilters } from "../_utils/params";
import type { ProductSearchParams } from "../page";

interface ProductType {
	slug: string;
	label: string;
	description: string | null;
}

interface ProductListingProps {
	searchParams: ProductSearchParams;
	productType?: ProductType;
	productTypes: ProductType[];
}

export async function ProductListing({
	searchParams,
	productType,
	productTypes,
}: ProductListingProps) {
	// Extraction du terme de recherche
	const searchTerm =
		typeof searchParams.search === "string" ? searchParams.search : undefined;

	// Récupérer les couleurs, matériaux et le prix maximum en parallèle
	const [colorsData, materials, maxPriceInCents] = await Promise.all([
		getColors({
			perPage: 100,
			sortBy: "name-ascending",
		}),
		getMaterialOptions(),
		getMaxProductPrice(),
	]);

	const maxPriceInEuros = centsToEuros(maxPriceInCents);
	const colors = colorsData.colors;

	// Paramètres de pagination et tri
	const cursor = getFirstParam(searchParams.cursor);
	const direction = (getFirstParam(searchParams.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage =
		Number(getFirstParam(searchParams.perPage)) ||
		GET_PRODUCTS_DEFAULT_PER_PAGE;
	const sortByFromFilter = getFirstParam(searchParams.filter_sortBy);
	const sortByFromParam = getFirstParam(searchParams.sortBy);
	const sortBy = sortByFromFilter || sortByFromParam || "created-descending";

	// Parser les filtres (avec ou sans type forcé)
	const baseFilters = parseFilters(searchParams);
	const filters = productType
		? { ...baseFilters, type: productType.slug }
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
	const hasActiveFilters = Object.keys(searchParams).some(
		(key) =>
			!["cursor", "direction", "perPage", "sortBy", "search", "type"].includes(
				key
			)
	);

	// Configuration dynamique selon le mode (hub ou type)
	const isTypePage = !!productType;
	const pageTitle = searchTerm
		? `Recherche "${searchTerm}"`
		: isTypePage
			? productType.label
			: "Mes créations";
	const pageDescription = isTypePage
		? productType.description || undefined
		: "Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !";
	const searchPlaceholder = isTypePage
		? `Rechercher des ${productType.label.toLowerCase()}...`
		: "Rechercher des bijoux...";
	const activeTab = isTypePage ? productType.slug : "tous";

	// Breadcrumbs
	const breadcrumbs = isTypePage
		? [
				{ label: "Bijoux", href: "/produits" },
				{ label: productType.label, href: `/produits/${productType.slug}` },
			]
		: [{ label: "Bijoux", href: "/produits" }];

	// JSON-LD structured data pour SEO
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: isTypePage ? productType.label : "Bijoux artisanaux faits main",
		description: isTypePage
			? productType.description ||
				`Découvrez nos ${productType.label.toLowerCase()} faits main à Nantes`
			: "Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !",
		url: isTypePage
			? `https://synclune.fr/produits/${productType.slug}`
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
							name: productType.label,
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
				navigation={
					<TabNavigation
						items={[
							{
								label: "Tous les bijoux",
								value: "tous",
								href: "/produits",
							},
							...productTypes.map((type) => ({
								label: type.label,
								value: type.slug,
								href: `/produits/${type.slug}`,
							})),
						]}
						activeValue={activeTab}
						ariaLabel="Navigation par types de bijoux"
						mobileVisibleCount={1}
					/>
				}
			/>

			{/* Section principale avec catalogue */}
			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="group/container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					<Toolbar
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
						<ProductFilterSheet
							colors={colors}
							materials={materials}
							maxPriceInEuros={maxPriceInEuros}
						/>
					</Toolbar>

					{hasActiveFilters && (
						<ProductFilterBadges colors={colors} materials={materials} />
					)}

					<Suspense fallback={<ProductListSkeleton />}>
						<ProductList productsPromise={productsPromise} perPage={perPage} />
					</Suspense>
				</div>
			</section>
		</div>
	);
}
