import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SortSelect } from "@/shared/components/sort-select";
import { Button } from "@/shared/components/ui/button";
import { ProductTypeFormDialog } from "@/modules/product-types/components/product-type-form-dialog";
import { CreateProductTypeButton } from "@/modules/product-types/components/admin/create-product-type-button";
import {
	getProductTypes,
	SORT_LABELS,
} from "@/modules/product-types/data/get-product-types";
import { getFirstParam } from "@/shared/utils/params";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProductTypesDataTable } from "@/modules/product-types/components/admin/product-types-data-table";
import { ProductTypesDataTableSkeleton } from "@/modules/product-types/components/admin/product-types-data-table-skeleton";
import { ProductTypesFilterBadges } from "@/modules/product-types/components/admin/product-types-filter-badges";
import { ProductTypesFilterSheet } from "@/modules/product-types/components/admin/product-types-filter-sheet";
import { DeleteProductTypeAlertDialog } from "@/modules/product-types/components/admin/delete-product-type-alert-dialog";
import type { ProductTypesSearchParams } from "./_types/search-params";
import { parseFilters } from "./_utils/params";
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
	// Force dynamic rendering to enable use cache: remote in functions
	await connection();

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

	// Create product types promise
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
			<PageHeader
				variant="compact"
				title="Types de bijoux"
				description="Gérez les types de bijoux"
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
				<DataTableToolbar ariaLabel="Barre d'outils de gestion des types de bijoux">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<SearchForm
							paramName="search"
							placeholder="Rechercher par label, slug..."
							ariaLabel="Rechercher un type de bijou par label ou slug"
							className="w-full"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
						<SortSelect
							label="Trier par"
							options={Object.entries(SORT_LABELS).map(([value, label]) => ({
								value,
								label,
							}))}
							placeholder="Label (A-Z)"
							className="w-full sm:min-w-[180px]"
						/>
						<ProductTypesFilterSheet />
					</div>
				</DataTableToolbar>

				{/* Badges de filtres actifs */}
				<ProductTypesFilterBadges />

				<Suspense fallback={<ProductTypesDataTableSkeleton />}>
					<ProductTypesDataTable productTypesPromise={productTypesPromise} />
				</Suspense>
			</div>
		</>
	);
}
