import { DEFAULT_PER_PAGE } from "@/shared/lib/pagination";
import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import dynamic from "next/dynamic";

// Lazy loading - form dialog page-level (CreateProductTypeButton)
const ProductTypeFormDialog = dynamic(() =>
	import("@/modules/product-types/components/product-type-form-dialog").then(
		(mod) => mod.ProductTypeFormDialog,
	),
);
import { ProductTypesAdminDialogs } from "./_components/product-types-admin-dialogs";
import { CreateProductTypeButton } from "@/modules/product-types/components/admin/create-product-type-button";
import { ProductTypesBottomBar } from "@/modules/product-types/components/admin/product-types-bottom-bar";
import { getProductTypes, SORT_LABELS } from "@/modules/product-types/data/get-product-types";
import { getFirstParam } from "@/shared/utils/params";
import { Suspense } from "react";
import { ProductTypesDataTable } from "@/modules/product-types/components/admin/product-types-data-table";
import { ProductTypesDataTableSkeleton } from "@/modules/product-types/components/admin/product-types-data-table-skeleton";
import { ProductTypesMobileList } from "@/modules/product-types/components/admin/product-types-mobile-list";
import { ProductTypesMobileListSkeleton } from "@/modules/product-types/components/admin/product-types-mobile-list-skeleton";
import { ProductTypesFilterBadges } from "@/modules/product-types/components/admin/product-types-filter-badges";
import { ProductTypesFilterSheet } from "@/modules/product-types/components/admin/product-types-filter-sheet";
import { ProductTypesSortBadge } from "@/modules/product-types/components/admin/product-types-sort-badge";
import { RefreshProductTypesButton } from "@/modules/product-types/components/admin/refresh-product-types-button";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { parseFilters } from "./_utils/params";

export type ProductTypeFiltersSearchParams = {
	filter_isActive?: string;
};

export type ProductTypesSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	sortOrder?: string;
} & ProductTypeFiltersSearchParams;

export type ParsedProductTypeFilters = {
	isActive?: boolean;
};
import { type Metadata } from "next";

export const metadata: Metadata = {
	title: "Types de bijoux - Administration",
	description: "Gérer les types de bijoux",
};

type ProductTypesAdminPageProps = {
	searchParams: Promise<ProductTypesSearchParams>;
};

export default async function ProductTypesAdminPage({ searchParams }: ProductTypesAdminPageProps) {
	const params = await searchParams;

	// Extract params
	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) ?? "label-ascending") as
		| "label-ascending"
		| "label-descending"
		| "products-ascending"
		| "products-descending";
	const search = getFirstParam(params.search);
	const filters = parseFilters(params);

	// La promise de types de produits n'est PAS awaitée pour permettre le streaming
	const productTypesPromise = getProductTypes({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters,
	});

	const hasActiveFilters = !!search || Object.keys(params).some((key) => key.startsWith("filter_"));

	return (
		<>
			<ProductTypeFormDialog />
			{/* Dialogs des actions long-press / row-actions (delete) */}
			<ProductTypesAdminDialogs />
			<PageHeader
				variant="compact"
				title="Types de bijoux"
				actions={<CreateProductTypeButton />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<ProductTypesBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des types de bijoux"
						search={
							<SearchInput
								size="sm"
								paramName="search"
								placeholder="Rechercher par label, slug…"
								aria-label="Rechercher un type de bijou par label ou slug"
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.entries(SORT_LABELS).map(([value, label]) => ({
								value,
								label,
							}))}
							placeholder="Label (A-Z)"
							className="w-full sm:min-w-45"
							noPrefix
						/>
						<ButtonGroup aria-label="Filtres et actions">
							<ProductTypesFilterSheet />
							<RefreshProductTypesButton />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<ProductTypesFilterBadges />
				</Suspense>

				{/* Sort badge mobile (visible si sortBy URL défini) */}
				<ProductTypesSortBadge />

				{/* Liste mobile */}
				<Suspense fallback={<ProductTypesMobileListSkeleton />}>
					<ProductTypesMobileList
						productTypesPromise={productTypesPromise}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
						filterParams={{ search, sortBy, filters }}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<ProductTypesDataTableSkeleton />}>
					<ProductTypesDataTable
						productTypesPromise={productTypesPromise}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
					/>
				</Suspense>
			</div>
		</>
	);
}
