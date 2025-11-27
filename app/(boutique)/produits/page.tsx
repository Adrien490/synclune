import { PageHeader } from "@/shared/components/page-header";

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
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { TabNavigation } from "@/shared/components/tab-navigation";
import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { getColors } from "@/modules/colors/data/get-colors";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { ProductFilterBadges } from "@/modules/products/components/filter-badges";
import { ProductFilterSheet } from "@/modules/products/components/product-filter-sheet";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import { priceInCentsToEuros } from "@/shared/utils/price-utils";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	SORT_LABELS,
	SORT_OPTIONS,
} from "@/modules/products/data/get-products";
import { getProducts } from "@/modules/products/data/get-products";
import type { SortField } from "@/modules/products/data/get-products";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { parseFilters } from "./_utils/params";

export const metadata: Metadata = {
	title: "Tous mes bijoux colorés faits main | Synclune - Nantes",
	description:
		"Découvrez tous mes bijoux colorés créés à la main dans mon atelier nantais. Inspirations Pokémon, Van Gogh, Twilight... Chaque pièce est unique !",
	keywords:
		"bijoux artisanaux, bijoux faits main, bijoutier Nantes, bagues colliers bracelets, acier inoxydable, perles, bijoux colorés, bijoux pokemon, bijoux van gogh",
	alternates: {
		canonical: "/produits",
	},
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

type BijouxHubPageProps = {
	searchParams: Promise<ProductSearchParams>;
};

/**
 * Page hub /produits
 *
 * Affiche tous les produits avec:
 * - Navigation par onglets de types
 * - Filtres (couleur, prix, tri)
 * - Recherche
 * - Pagination
 */
export default async function BijouxHubPage({
	searchParams,
}: BijouxHubPageProps) {
	const searchParamsData = await searchParams;

	// Helper pour extraire les paramètres
	const getFirstParam = (
		param: string | string[] | undefined
	): string | undefined => {
		if (Array.isArray(param)) return param[0];
		return param;
	};

	// SEO: Si un type est passé en search param, rediriger vers la page dédiée
	// Exemple: /produits?type=bagues → /produits/bagues
	const typeParam = getFirstParam(searchParamsData.type);
	if (typeParam) {
		redirect(`/produits/${typeParam}`);
	}

	// Récupérer tous les types de bijoux actifs
	const productTypesData = await getProductTypes({
		perPage: 50,
		sortBy: "label-ascending",
		filters: {
			isActive: true,
		},
	});

	// Extraction du terme de recherche
	const searchTerm =
		typeof searchParamsData.search === "string"
			? searchParamsData.search
			: undefined;

	// Récupérer les couleurs et le prix maximum
	const [colorsData, maxPriceInCents] = await Promise.all([
		getColors({
			perPage: 100,
			sortBy: "name-ascending",
		}),
		getMaxProductPrice(),
	]);

	// Conversion en euros côté UI (la DAL retourne des centimes)
	const maxPriceInEuros = priceInCentsToEuros(maxPriceInCents);

	const colors = colorsData.colors;

	// Récupérer les produits avec filtres (TOUS les produits, sans filtre de type)
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

	// Parser les filtres (sans filtre de type pour afficher tous les bijoux)
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
		name: "Bijoux artisanaux faits main",
		description:
			"Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !",
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
		<div className="min-h-screen relative">
			{/* JSON-LD Structured Data */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			{/* Background décoratif - Particules pour ambiance bijoux */}
			<ParticleSystem variant="section" className="absolute inset-0 z-20" />

			<PageHeader
				title={searchTerm ? `Recherche "${searchTerm}"` : "Mes créations"}
				description={
					searchTerm
						? undefined
						: "Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !"
				}
				breadcrumbs={[{ label: "Bijoux", href: "/produits" }]}
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
						activeValue="tous"
						ariaLabel="Navigation par types de bijoux"
					/>
				}
			/>

			{/* Section principale avec catalogue */}
			<section className="bg-background py-8 relative z-10">
				<div className="group/container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Toolbar élégante avec les styles Synclune */}
					<div className="bg-card border border-border rounded-lg p-4 shadow-sm transition-all duration-200">
						<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
							{/* Section gauche - Search form */}
							<div className="flex-1 sm:max-w-md">
								<SearchForm
									paramName="search"
									placeholder="Rechercher des bijoux..."
									className="w-full focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 border-secondary/40 hover:border-secondary/60 transition-colors duration-200"
								/>
							</div>

							{/* Section droite - Tri et Filtres */}
							<div className="flex flex-row items-center gap-3 sm:gap-3 sm:shrink-0">
								<SelectFilter
									filterKey="sortBy"
									label="Trier par"
									options={Object.values(SORT_OPTIONS).map((option) => ({
										value: option,
										label: SORT_LABELS[option as keyof typeof SORT_LABELS],
									}))}
									placeholder="Plus récents"
									className="min-w-0 flex-1 sm:min-w-[160px] sm:flex-none border-secondary/40 hover:border-secondary/60 focus:border-primary focus:ring-primary/20 transition-all duration-200"
								/>
								<ProductFilterSheet
									className="shrink-0"
									colors={colors}
									maxPriceInEuros={maxPriceInEuros}
								/>
							</div>
						</div>
					</div>

					{hasActiveFilters && <ProductFilterBadges colors={colors} />}

					<Suspense fallback={<ProductListSkeleton />}>
						<ProductList productsPromise={productsPromise} perPage={perPage} />
					</Suspense>
				</div>
			</section>
		</div>
	);
}
