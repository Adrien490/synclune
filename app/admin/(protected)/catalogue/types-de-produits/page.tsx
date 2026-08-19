import {
	CreateTaxonomyButton,
	TaxonomySortBadge,
} from "@/modules/taxonomies/components/taxonomy-list-controls";
import { TaxonomyFilterBadges } from "@/modules/taxonomies/components/taxonomy-filter-badges";
import { TaxonomyBottomBar } from "@/modules/taxonomies/components/taxonomy-bottom-bar";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { GET_PRODUCT_TYPES_DEFAULT_SORT_BY } from "@/modules/product-types/constants/product-type.constants";
import { FilterTriggerButton } from "@/shared/components/filter-trigger-button";
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
import { getProductTypes, SORT_LABELS } from "@/modules/product-types/data/get-product-types";
import { getFirstParam } from "@/shared/utils/params";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { Suspense } from "react";
import { ProductTypesDataTable } from "@/modules/product-types/components/admin/product-types-data-table";
import { ProductTypesDataTableSkeleton } from "@/modules/product-types/components/admin/product-types-data-table-skeleton";
import { ProductTypesMobileList } from "@/modules/product-types/components/admin/product-types-mobile-list";
import { ProductTypesMobileListSkeleton } from "@/modules/product-types/components/admin/product-types-mobile-list-skeleton";
import { RefreshProductTypesButton } from "@/modules/product-types/components/admin/refresh-product-types-button";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { parseFilters } from "./_utils/params";
import { ADMIN_LIST_GROUP_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

export type ProductTypeFiltersSearchParams = {
	/** Seul filtre du modèle lean — cf. `TAXONOMY_CONFIG["product-type"].filters`. */
	filter_hasProducts?: string;
};

export type ProductTypesSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	sortOrder?: string;
} & ProductTypeFiltersSearchParams;

import { type Metadata } from "next";
import { ResultCountLiveRegion } from "@/shared/components/result-count-live-region";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Types de bijoux - Administration",
	description: "Gérer les types de bijoux",
};

type ProductTypesAdminPageProps = {
	searchParams: Promise<ProductTypesSearchParams>;
};

export default async function ProductTypesAdminPage({ searchParams }: ProductTypesAdminPageProps) {
	await assertAdminPage();

	const params = await searchParams;

	// Extract params
	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	// Repli sur le tri par défaut plutôt qu'un cast aveugle : un `?sortBy=bogus`
	// faisait échouer le safeParse de getProductTypes → liste VIDE sans message.
	// La constante SSOT, pas un littéral : `TaxonomySortBadge` compare l'URL à
	// `config.defaultSort` (même constante) — un littéral qui divergerait ferait
	// annoncer « Tri actif » à tort, ou jamais.
	const rawSortBy = getFirstParam(params.sortBy);
	const sortBy = (
		rawSortBy && rawSortBy in SORT_LABELS ? rawSortBy : GET_PRODUCT_TYPES_DEFAULT_SORT_BY
	) as keyof typeof SORT_LABELS;
	const search = searchParamParsers.search(params.search);
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
				actions={<CreateTaxonomyButton kind="product-type" />}
				className="hidden md:block"
			/>

			<div className={cn(ADMIN_LIST_GROUP_CLASS, "space-y-6")}>
				<Suspense fallback={null}>
					<ResultCountLiveRegion
						totalCount={productTypesPromise.then((d) => d.totalCount)}
						query={search}
						singular={TAXONOMY_CONFIG["product-type"].labels.singular}
						plural={TAXONOMY_CONFIG["product-type"].labels.plural}
					/>
				</Suspense>

				<TaxonomyBottomBar kind="product-type" />

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
							<FilterTriggerButton />
							<RefreshProductTypesButton />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<TaxonomyFilterBadges kind="product-type" />
				</Suspense>

				{/* Sort badge mobile (visible si sortBy URL défini) */}
				<TaxonomySortBadge kind="product-type" />

				{/* Liste mobile */}
				<Suspense fallback={<ProductTypesMobileListSkeleton hasActiveFilters={hasActiveFilters} />}>
					<ProductTypesMobileList
						productTypesPromise={productTypesPromise}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
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
