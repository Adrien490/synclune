import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { Button } from "@/shared/components/ui/button";
import { getColors } from "@/modules/colors/data/get-colors";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getProducts } from "@/modules/products/data/get-products";
import { getMaxProductPrice } from "@/modules/products/data/get-max-product-price";
import {
	GET_PRODUCTS_SORT_FIELDS,
	ADMIN_PRODUCTS_SORT_LABELS,
} from "@/modules/products/constants/product.constants";
import { parseProductParams } from "@/modules/products/utils/parse-product-params";
import Link from "next/link";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// Lazy loading - dialogs charges uniquement a l'ouverture
const ArchiveProductAlertDialog = dynamic(() =>
	import("@/modules/products/components/admin/archive-product-alert-dialog").then(
		(mod) => mod.ArchiveProductAlertDialog,
	),
);
const BulkArchiveProductsAlertDialog = dynamic(() =>
	import("@/modules/products/components/admin/bulk-archive-products-alert-dialog").then(
		(mod) => mod.BulkArchiveProductsAlertDialog,
	),
);
const BulkDeleteProductsAlertDialog = dynamic(() =>
	import("@/modules/products/components/admin/bulk-delete-products-alert-dialog").then(
		(mod) => mod.BulkDeleteProductsAlertDialog,
	),
);
const ChangeProductStatusAlertDialog = dynamic(() =>
	import("@/modules/products/components/admin/change-product-status-alert-dialog").then(
		(mod) => mod.ChangeProductStatusAlertDialog,
	),
);
const DeleteProductAlertDialog = dynamic(() =>
	import("@/modules/products/components/admin/delete-product-alert-dialog").then(
		(mod) => mod.DeleteProductAlertDialog,
	),
);
const DuplicateProductAlertDialog = dynamic(() =>
	import("@/modules/products/components/admin/duplicate-product-alert-dialog").then(
		(mod) => mod.DuplicateProductAlertDialog,
	),
);
const ManageCollectionsDialog = dynamic(() =>
	import("@/modules/products/components/admin/manage-collections-dialog").then(
		(mod) => mod.ManageCollectionsDialog,
	),
);
import { ProductsDataTable } from "@/modules/products/components/admin/products-data-table";
import { ProductsDataTableSkeleton } from "@/modules/products/components/admin/products-data-table-skeleton";
import { ProductsFilterBadges } from "@/modules/products/components/admin/products-filter-badges";
import { ProductsBottomBar } from "@/modules/products/components/admin/products-bottom-bar";
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
	filter_updatedAfter?: string;
	filter_updatedBefore?: string;
	filter_material?: string | string[];
	filter_color?: string | string[];
	filter_collectionSlug?: string | string[];
	filter_inStock?: string;
	filter_withDeleted?: string;
	filter_createdAfter?: string;
	filter_createdBefore?: string;
	filter_onSale?: string;
};

export type ProductsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
} & ProductFiltersSearchParams;
import { type Metadata } from "next";

export const metadata: Metadata = {
	title: "Produits - Administration",
	description: "Gérer les produits du catalogue",
};

type ProductsAdminPageProps = {
	searchParams: Promise<ProductsSearchParams>;
};

export default function ProductsAdminPage({ searchParams }: ProductsAdminPageProps) {
	return (
		<>
			<PageHeader
				variant="compact"
				title="Produits"
				className="hidden md:block"
				actions={
					<Button asChild>
						<Link href="/admin/catalogue/produits/nouveau">Nouveau produit</Link>
					</Button>
				}
			/>

			<Suspense fallback={<ProductsDataTableSkeleton />}>
				<ProductsContent searchParams={searchParams} />
			</Suspense>

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

async function ProductsContent({ searchParams }: { searchParams: Promise<ProductsSearchParams> }) {
	const params = await searchParams;

	// Parse and validate all search parameters safely
	const { cursor, direction, perPage, sortBy, search } = parseProductParams(params);

	const [
		productsData,
		productTypesData,
		collectionsData,
		colorsData,
		materialsData,
		maxPriceInCents,
	] = await Promise.all([
		getProducts({
			cursor,
			direction,
			perPage,
			sortBy,
			search,
			filters: parseFilters(params),
		}),
		getProductTypes({
			perPage: 100,
			sortBy: "label-ascending",
		}),
		getCollections({
			perPage: 100,
			sortBy: "name-ascending",
			filters: {
				hasProducts: undefined,
			},
		}),
		getColors({ perPage: 200, sortBy: "name-ascending" }),
		getMaterialOptions(),
		getMaxProductPrice(),
	]);

	const productTypes = productTypesData.productTypes.map((t) => ({
		id: t.id,
		label: t.label,
		slug: t.slug,
	}));

	const collections = collectionsData.collections.map((c) => ({
		id: c.id,
		name: c.name,
		slug: c.slug,
	}));

	const colors = colorsData.colors;
	const materials = materialsData;

	return (
		<div className="space-y-6">
			<Toolbar
				className="hidden md:flex"
				ariaLabel="Barre d'outils de gestion des produits"
				search={
					<SearchInput
						mode="live"
						size="sm"
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
						label: ADMIN_PRODUCTS_SORT_LABELS[field] ?? field,
					}))}
					placeholder="Plus récents"
					className="w-full sm:min-w-45"
					noPrefix
				/>
				<ProductsFilterSheet
					productTypes={productTypes}
					collections={collections}
					colors={colors}
					materials={materials}
					maxPriceInCents={maxPriceInCents}
				/>
				<RefreshProductsButton />
			</Toolbar>

			{/* Badges de filtres actifs */}
			<div className="hidden md:block">
				<ProductsFilterBadges
					productTypes={productTypes}
					collections={collections}
					colors={colors}
					materials={materials}
				/>
			</div>

			<ProductsDataTable
				productsPromise={Promise.resolve(productsData)}
				perPage={perPage}
				hasActiveFilters={!!search || Object.keys(params).some((key) => key.startsWith("filter_"))}
			/>

			<ProductsBottomBar
				productTypes={productTypes}
				collections={collections}
				colors={colors}
				materials={materials}
				maxPriceInCents={maxPriceInCents}
			/>
		</div>
	);
}
