import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SortSelect } from "@/shared/components/sort-select";
import { Button } from "@/shared/components/ui/button";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getProducts } from "@/modules/products/data/get-products";
import { GET_PRODUCTS_SORT_FIELDS } from "@/modules/products/data/get-products";
import { getProductCountsByStatus } from "@/modules/products/data/get-product-counts-by-status";
import { parseProductParams } from "@/modules/products/utils/parse-product-params";
import Link from "next/link";
import { Suspense } from "react";
import { ArchiveProductAlertDialog } from "@/modules/products/components/admin/archive-product-alert-dialog";
import { BulkArchiveProductsAlertDialog } from "@/modules/products/components/admin/bulk-archive-products-alert-dialog";
import { BulkDeleteProductsAlertDialog } from "@/modules/products/components/admin/bulk-delete-products-alert-dialog";
import { ChangeProductStatusAlertDialog } from "@/modules/products/components/admin/change-product-status-alert-dialog";
import { DeleteProductAlertDialog } from "@/modules/products/components/admin/delete-product-alert-dialog";
import { DuplicateProductAlertDialog } from "@/modules/products/components/admin/duplicate-product-alert-dialog";
import { ProductStatusNavigation } from "@/modules/products/components/admin/product-status-navigation";
import { ProductsDataTable } from "@/modules/products/components/admin/products-data-table";
import { ProductsDataTableSkeleton } from "@/modules/products/components/admin/products-data-table-skeleton";
import { ProductsFilterBadges } from "@/modules/products/components/admin/products-filter-badges";
import { ProductsFilterSheet } from "@/modules/products/components/admin/products-filter-sheet";
import { ProductsQuickFilters } from "@/modules/products/components/admin/products-quick-filters";
import type { ProductsSearchParams } from "./_types/search-params";
import { parseFilters } from "./_utils/params";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Bijoux - Administration",
	description: "Gérer les bijoux du catalogue",
};

type ProductsAdminPageProps = {
	searchParams: Promise<ProductsSearchParams>;
};

const SORT_LABELS: Record<string, string> = {
	"title-ascending": "Titre (A-Z)",
	"title-descending": "Titre (Z-A)",
	"price-ascending": "Prix croissant",
	"price-descending": "Prix décroissant",
	"created-ascending": "Plus anciens",
	"created-descending": "Plus récents",
	createdAt: "Date de création",
	updatedAt: "Date de mise à jour",
	title: "Titre",
	type: "Type",
};

export default async function ProductsAdminPage({
	searchParams,
}: ProductsAdminPageProps) {
	// Rend la page dynamique pour permettre use cache: remote dans les fonctions

	const params = await searchParams;

	// Parse and validate all search parameters safely
	const { cursor, direction, perPage, sortBy, search, status } =
		parseProductParams(params);

	const productsPromise = getProducts({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: parseFilters(params),
		status,
	});

	// Load filter options data and counts in parallel
	const [productTypesData, collectionsData, productCounts] = await Promise.all([
		getProductTypes({
			perPage: 100,
			sortBy: "label-ascending",
			sortOrder: "asc",
		}),
		getCollections({
			perPage: 100,
			sortBy: "name-ascending",
			filters: {
				hasProducts: undefined,
			},
		}),
		getProductCountsByStatus(),
	]);

	const productTypes = productTypesData.productTypes.map((t) => ({
		id: t.id,
		label: t.label,
	}));

	const collections = collectionsData.collections.map((c) => ({
		id: c.id,
		name: c.name,
		slug: c.slug,
	}));

	return (
		<>
			<PageHeader
				variant="compact"
				title="Bijoux"
				description="Gérez votre catalogue de bijoux"
				actions={
					<Button asChild>
						<Link href="/admin/catalogue/produits/nouveau">
							Nouveau bijou
						</Link>
					</Button>
				}
			/>

			<div className="space-y-6">
				{/* Onglets de statut */}
				<ProductStatusNavigation
					currentStatus={status!}
					searchParams={params}
					counts={productCounts}
				/>

				<DataTableToolbar ariaLabel="Barre d'outils de gestion des produits">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<SearchForm
							paramName="search"
							placeholder="Rechercher par titre, type..."
							ariaLabel="Rechercher un produit par titre ou type"
							className="w-full"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
						<ProductsQuickFilters />
						<SortSelect
							label="Trier par"
							options={GET_PRODUCTS_SORT_FIELDS.map((field) => ({
								value: field,
								label: SORT_LABELS[field] || field,
							}))}
							placeholder="Plus récents"
							className="w-full sm:min-w-[180px]"
						/>
						<ProductsFilterSheet
							productTypes={productTypes}
							collections={collections}
						/>
					</div>
				</DataTableToolbar>

				{/* Badges de filtres actifs */}
				<ProductsFilterBadges
					productTypes={productTypes}
					collections={collections}
				/>

				<Suspense fallback={<ProductsDataTableSkeleton />}>
					<ProductsDataTable productsPromise={productsPromise} />
				</Suspense>
			</div>

			{/* Alert Dialogs globaux */}
			<ArchiveProductAlertDialog />
			<BulkArchiveProductsAlertDialog />
			<BulkDeleteProductsAlertDialog />
			<ChangeProductStatusAlertDialog />
			<DeleteProductAlertDialog />
			<DuplicateProductAlertDialog />
		</>
	);
}
