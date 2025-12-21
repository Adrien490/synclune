import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { Button } from "@/shared/components/ui/button";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getProducts } from "@/modules/products/data/get-products";
import { GET_PRODUCTS_SORT_FIELDS } from "@/modules/products/data/get-products";
import { parseProductParams } from "@/modules/products/utils/parse-product-params";
import Link from "next/link";
import { Suspense } from "react";
import { ArchiveProductAlertDialog } from "@/modules/products/components/admin/archive-product-alert-dialog";
import { BulkArchiveProductsAlertDialog } from "@/modules/products/components/admin/bulk-archive-products-alert-dialog";
import { BulkDeleteProductsAlertDialog } from "@/modules/products/components/admin/bulk-delete-products-alert-dialog";
import { ChangeProductStatusAlertDialog } from "@/modules/products/components/admin/change-product-status-alert-dialog";
import { DeleteProductAlertDialog } from "@/modules/products/components/admin/delete-product-alert-dialog";
import { DuplicateProductAlertDialog } from "@/modules/products/components/admin/duplicate-product-alert-dialog";
import { ManageCollectionsDialog } from "@/modules/products/components/admin/manage-collections-dialog";
import { ProductStatusNavigation } from "@/modules/products/components/admin/product-status-navigation";
import { ProductsDataTable } from "@/modules/products/components/admin/products-data-table";
import { ProductsDataTableSkeleton } from "@/modules/products/components/admin/products-data-table-skeleton";
import { ProductsFilterBadges } from "@/modules/products/components/admin/products-filter-badges";
import { ProductsFilterSheet } from "@/modules/products/components/admin/products-filter-sheet";
import { ProductsQuickFilters } from "@/modules/products/components/admin/products-quick-filters";
import { RefreshProductsButton } from "@/modules/products/components/admin/refresh-products-button";
import { parseFilters } from "./_utils/params";

export type ProductFiltersSearchParams = {
	filter_priceMin?: string;
	filter_priceMax?: string;
	filter_isPublished?: string;
	filter_publishedAfter?: string;
	filter_publishedBefore?: string;
	filter_status?: string | string[];
	filter_labelId?: string | string[];
	filter_typeId?: string | string[];
	filter_collectionId?: string | string[];
	filter_stockStatus?: string | string[];
	filter_sortBy?: string;
	filter_updatedAfter?: string;
	filter_updatedBefore?: string;
	filter_material?: string | string[];
	filter_collectionSlug?: string | string[];
	filter_inStock?: string;
	filter_withDeleted?: string;
	filter_createdAfter?: string;
	filter_createdBefore?: string;
};

export type ProductsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
} & ProductFiltersSearchParams;
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Produits - Administration",
	description: "Gérer les produits du catalogue",
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

	// Load filter options data in parallel
	const [productTypesData, collectionsData] = await Promise.all([
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
				title="Produits"
				actions={
					<Button asChild>
						<Link href="/admin/catalogue/produits/nouveau">
							Nouveau produit
						</Link>
					</Button>
				}
			/>

			<div className="space-y-6">
				{/* Onglets de statut */}
				<ProductStatusNavigation
					currentStatus={status}
					searchParams={params}
				/>

				<Toolbar
					ariaLabel="Barre d'outils de gestion des produits"
					search={
						<SearchInput mode="live" size="sm"
							paramName="search"
							placeholder="Rechercher par titre, type..."
							ariaLabel="Rechercher un produit par titre ou type"
							className="w-full"
						/>
					}
				>
					<ProductsQuickFilters />
					<SelectFilter
						filterKey="sortBy"
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
					<RefreshProductsButton />
				</Toolbar>

				{/* Badges de filtres actifs */}
				<ProductsFilterBadges
					productTypes={productTypes}
					collections={collections}
				/>

				<Suspense fallback={<ProductsDataTableSkeleton />}>
					<ProductsDataTable productsPromise={productsPromise} perPage={perPage} />
				</Suspense>
			</div>

			{/* Alert Dialogs globaux */}
			<ArchiveProductAlertDialog />
			<BulkArchiveProductsAlertDialog />
			<BulkDeleteProductsAlertDialog />
			<ChangeProductStatusAlertDialog />
			<DeleteProductAlertDialog />
			<DuplicateProductAlertDialog />
			<ManageCollectionsDialog />
		</>
	);
}
