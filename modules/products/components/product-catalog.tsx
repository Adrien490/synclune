import { Suspense } from "react";
import dynamic from "next/dynamic";

import type { GetProductsReturn, SortField } from "@/modules/products/data/get-products";
import type { ProductType } from "@/modules/product-types/types/product-type.types";
import type { Color } from "@/modules/colors/types/color.types";
import type { MaterialOption } from "@/modules/materials/types/materials.types";

import {
	SORT_LABELS,
	SORT_OPTIONS,
} from "@/modules/products/constants/product.constants";

import { ProductFilterBadges } from "@/modules/products/components/filter-badges";
import { ProductFilterTrigger } from "@/modules/products/components/product-filter-trigger";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { BottomActionBar } from "@/modules/products/components/bottom-action-bar";

import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SelectFilter } from "@/shared/components/select-filter";
import { ClearSearchButton } from "@/shared/components/clear-search-button";
import { SearchInput } from "@/shared/components/search-input";

// Lazy loading - filter sheet charge uniquement a l'ouverture
const ProductFilterSheet = dynamic(
	() => import("@/modules/products/components/product-filter-sheet").then((mod) => mod.ProductFilterSheet)
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

	const pageDescription = activeProductType?.description
		? activeProductType.description
		: "Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !";

	// Sort options for mobile drawer
	const sortOptions = Object.values(SORT_OPTIONS).map((option) => ({
		value: option,
		label: SORT_LABELS[option as keyof typeof SORT_LABELS],
	}));

	const searchPlaceholder = activeProductType
		? `Rechercher des ${activeProductType.label.toLowerCase()}...`
		: "Rechercher des bijoux...";

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
					</div>
				}
			/>

			{/* Section principale avec catalogue */}
			<section
				className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10"
				aria-label="Catalogue des créations"
			>
				<div
					id="product-container"
					className="group/container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
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
							options={Object.values(SORT_OPTIONS).map((option) => ({
								value: option,
								label: SORT_LABELS[option as keyof typeof SORT_LABELS],
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

					<Suspense fallback={<ProductListSkeleton />}>
						<ProductList productsPromise={productsPromise} perPage={perPage} />
					</Suspense>
				</div>
			</section>

			<ProductFilterSheet
				colors={colors}
				materials={materials}
				productTypes={productTypes.map((t) => ({
					slug: t.slug,
					label: t.label,
				}))}
				maxPriceInEuros={maxPriceInEuros}
				activeProductTypeSlug={activeProductType?.slug}
			/>

			{/* Bottom Action Bar Mobile */}
			<BottomActionBar sortOptions={sortOptions} />
		</div>
	);
}
