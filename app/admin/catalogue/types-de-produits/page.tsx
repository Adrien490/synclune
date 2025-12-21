import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { Button } from "@/shared/components/ui/button";
import { ProductTypeFormDialog } from "@/modules/product-types/components/product-type-form-dialog";
import { CreateProductTypeButton } from "@/modules/product-types/components/admin/create-product-type-button";
import {
	getProductTypes,
	SORT_LABELS,
} from "@/modules/product-types/data/get-product-types";
import { getFirstParam } from "@/shared/utils/params";
import Link from "next/link";
import { Suspense } from "react";
import { ProductTypesDataTable } from "@/modules/product-types/components/admin/product-types-data-table";
import { ProductTypesDataTableSkeleton } from "@/modules/product-types/components/admin/product-types-data-table-skeleton";
import { ProductTypesFilterBadges } from "@/modules/product-types/components/admin/product-types-filter-badges";
import { ProductTypesFilterSheet } from "@/modules/product-types/components/admin/product-types-filter-sheet";
import { DeleteProductTypeAlertDialog } from "@/modules/product-types/components/admin/delete-product-type-alert-dialog";
import { BulkDeleteProductTypesAlertDialog } from "@/modules/product-types/components/admin/bulk-delete-product-types-alert-dialog";
import { RefreshProductTypesButton } from "@/modules/product-types/components/admin/refresh-product-types-button";
import { parseFilters } from "./_utils/params";

export type ProductTypeFiltersSearchParams = {
	filter_isActive?: string;
	filter_hasSize?: string;
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
	hasSize?: boolean;
};
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Types de bijoux - Administration",
	description: "Gérer les types de bijoux",
};

type ProductTypesAdminPageProps = {
	searchParams: Promise<ProductTypesSearchParams>;
};

export default async function ProductTypesAdminPage({
	searchParams,
}: ProductTypesAdminPageProps) {
	const params = await searchParams;

	// Extract params
	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) || "label-ascending") as
		| "label-ascending"
		| "label-descending"
		| "products-ascending"
		| "products-descending";
	const sortOrder = (getFirstParam(params.sortOrder) || "asc") as
		| "asc"
		| "desc";
	const search = getFirstParam(params.search);

	// La promise de types de produits n'est PAS awaitée pour permettre le streaming
	const productTypesPromise = getProductTypes({
		cursor,
		direction,
		perPage,
		sortBy,
		sortOrder,
		search,
		filters: parseFilters(params),
	});

	return (
		<>
			<ProductTypeFormDialog />
			<DeleteProductTypeAlertDialog />
			<BulkDeleteProductTypesAlertDialog />
			<PageHeader
				variant="compact"
				title="Types de bijoux"
				actions={
					<div className="flex gap-3">
						<Button asChild variant="outline">
							<Link href="/admin/catalogue/types-de-produits/trash">
								Corbeille
							</Link>
						</Button>
						<CreateProductTypeButton />
					</div>
				}
			/>

			<div className="space-y-6">
				<Toolbar
					ariaLabel="Barre d'outils de gestion des types de bijoux"
					search={
						<SearchInput mode="live" size="sm"
							paramName="search"
							placeholder="Rechercher par label, slug..."
							ariaLabel="Rechercher un type de bijou par label ou slug"
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
						className="w-full sm:min-w-[180px]"
					/>
					<ProductTypesFilterSheet />
					<RefreshProductTypesButton />
				</Toolbar>

				{/* Badges de filtres actifs */}
				<ProductTypesFilterBadges />

				<Suspense fallback={<ProductTypesDataTableSkeleton />}>
					<ProductTypesDataTable productTypesPromise={productTypesPromise} perPage={perPage} />
				</Suspense>
			</div>
		</>
	);
}
