import { Suspense } from "react";
import dynamic from "next/dynamic";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import type { ProductType } from "@/modules/product-types/types/product-type.types";
import type { Color } from "@/modules/colors/types/color.types";
import type { MaterialOption } from "@/modules/materials/types/materials.types";

import {
	PRODUCTS_SORT_LABELS,
	PRODUCTS_SORT_OPTIONS,
} from "@/modules/products/constants/product.constants";

import { ProductFilterBadges } from "@/modules/products/components/filter-badges";
import { ProductFilterTrigger } from "@/modules/products/components/product-filter-trigger";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { ProductSortBar } from "@/modules/products/components/product-sort-bar";

import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SelectFilter } from "@/shared/components/select-filter";
import { ClearSearchButton } from "@/shared/components/clear-search-button";
import { SearchInput } from "@/shared/components/search-input";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

// Lazy loading - filter sheet charge uniquement a l'ouverture
const ProductFilterSheet = dynamic(() =>
	import("@/modules/products/components/product-filter-sheet").then(
		(mod) => mod.ProductFilterSheet,
	),
);

// ============================================================================
// TYPES
// ============================================================================

export type ProductCatalogProps = {
	/** Promise des produits (permet le streaming) */
	productsPromise: Promise<GetProductsReturn>;
	/** Nombre de produits par page */
	perPage: number;
	/** Terme de recherche actif */
	searchTerm?: string;
	/** Wishlist product IDs (pre-fetched at page level to avoid inline promise) */
	wishlistProductIdsPromise?: Promise<Set<string>>;
	/** Type de produit filtré (pour la page catégorie) */
	activeProductType?: {
		slug: string;
		label: string;
		description?: string | null;
	};
	/** Tous les types de produits disponibles */
	productTypes: ProductType[];
	/** Toutes les couleurs disponibles */
	colors: Color[];
	/** Tous les matériaux disponibles */
	materials: MaterialOption[];
	/** Prix maximum en euros */
	maxPriceInEuros: number;
	/** Nombre de filtres actifs */
	activeFiltersCount: number;
	/** JSON-LD structured data */
	jsonLd: object;
	/** Breadcrumbs */
	breadcrumbs: Array<{ label: string; href: string }>;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductCatalog({
	productsPromise,
	perPage,
	searchTerm,
	wishlistProductIdsPromise,
	activeProductType,
	productTypes,
	colors,
	materials,
	maxPriceInEuros,
	activeFiltersCount,
	jsonLd,
	breadcrumbs,
}: ProductCatalogProps) {
	const hasActiveFilters = activeFiltersCount > 0;

	// Configuration de la page
	const pageTitle = searchTerm
		? `Recherche "${searchTerm}"`
		: activeProductType
			? activeProductType.label
			: "Les créations";

	const pageDescription =
		activeProductType?.description ??
		"Découvrez toutes mes créations colorées faites main dans mon atelier. Des pièces uniques inspirées de mes passions !";

	// Sort options for mobile drawer
	const sortOptions = Object.values(PRODUCTS_SORT_OPTIONS).map((option) => ({
		value: option,
		label: PRODUCTS_SORT_LABELS[option as keyof typeof PRODUCTS_SORT_LABELS],
	}));

	const searchPlaceholder = activeProductType
		? `Rechercher des ${activeProductType.label.toLowerCase()}...`
		: "Rechercher des bijoux...";

	return (
		<div className="min-h-screen">
			{/* JSON-LD Structured Data */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

			<PageHeader
				className="hidden sm:block"
				title={pageTitle}
				description={searchTerm ? undefined : pageDescription}
				breadcrumbs={breadcrumbs}
				actions={
					<div className="flex items-center gap-2 md:hidden">
						<ClearSearchButton />
					</div>
				}
			/>

			{/* Section principale avec catalogue */}
			<section
				className="bg-background relative z-10 pt-[calc(var(--navbar-height)+1rem)] pb-12 sm:pt-4 lg:pt-6 lg:pb-16"
				aria-label="Catalogue des créations"
			>
				<div
					id="product-container"
					className="group/container mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8"
				>
					{/* Desktop Toolbar - hidden on mobile */}
					<Toolbar
						className="hidden md:flex"
						search={
							<SearchInput
								mode="live"
								size="sm"
								paramName="search"
								placeholder={searchPlaceholder}
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.values(PRODUCTS_SORT_OPTIONS).map((option) => ({
								value: option,
								label: PRODUCTS_SORT_LABELS[option as keyof typeof PRODUCTS_SORT_LABELS],
							}))}
							placeholder="Trier par"
							noPrefix
						/>
						<ProductFilterTrigger />
					</Toolbar>

					{hasActiveFilters && (
						<ProductFilterBadges
							colors={colors}
							materials={materials}
							productTypes={productTypes}
						/>
					)}

					<ErrorBoundary
						errorMessage="Impossible de charger les produits"
						className="flex min-h-[200px] items-center justify-center rounded-xl"
					>
						<Suspense fallback={<ProductListSkeleton />}>
							<ProductList
								productsPromise={productsPromise}
								perPage={perPage}
								searchTerm={searchTerm}
								wishlistProductIdsPromise={wishlistProductIdsPromise}
							/>
						</Suspense>
					</ErrorBoundary>
				</div>
			</section>

			<ProductFilterSheet
				colors={colors}
				materials={materials}
				productTypes={productTypes.map((t) => ({
					slug: t.slug,
					label: t.label,
					_count: t._count,
				}))}
				maxPriceInEuros={maxPriceInEuros}
				activeProductTypeSlug={activeProductType?.slug}
			/>

			{/* Bottom Action Bar Mobile */}
			<ProductSortBar sortOptions={sortOptions} />
		</div>
	);
}
