import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { getProductSkus } from "@/modules/skus/data/get-skus";
import { parseProductSkuParams } from "@/modules/skus/utils/parse-sku-params";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { SORT_LABELS } from "@/modules/skus/constants/sku.constants";
import { ProductVariantsDataTable } from "@/modules/skus/components/admin/skus-data-table";
import { SkusDataTableSkeleton } from "@/modules/skus/components/admin/skus-data-table-skeleton";
import { RefreshSkusButton } from "@/modules/skus/components/admin/refresh-skus-button";
import { DeleteProductSkuAlertDialog } from "@/modules/skus/components/admin/delete-sku-alert-dialog";
import { AdjustStockDialog } from "@/modules/skus/components/admin/adjust-stock-dialog";
import { UpdatePriceDialog } from "@/modules/skus/components/admin/update-price-dialog";
import { BulkAdjustStockDialog } from "@/modules/skus/components/admin/bulk-adjust-stock-dialog";
import { BulkUpdatePriceDialog } from "@/modules/skus/components/admin/bulk-update-price-dialog";
import { SkusFilterSheet } from "@/modules/skus/components/admin/skus-filter-sheet";
import { SkusFilterBadges } from "@/modules/skus/components/admin/skus-filter-badges";

export type ProductVariantsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_stockStatus?: string | string[];
	filter_colorId?: string | string[];
	filter_materialId?: string | string[];
	filter_isActive?: string;
};

type ProductVariantsPageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<ProductVariantsSearchParams>;
};

// Normalise une valeur string ou string[] en tableau
function normalizeArray(value: string | string[] | undefined): string[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

// Parse les filtres depuis les parametres URL
function parseVariantFilters(params: ProductVariantsSearchParams) {
	const stockStatuses = normalizeArray(params.filter_stockStatus).filter(
		(s) => s !== "all"
	);
	const colorIds = normalizeArray(params.filter_colorId);
	const materialIds = normalizeArray(params.filter_materialId);

	// Parse isActive
	let isActive: boolean | undefined;
	if (params.filter_isActive === "true") {
		isActive = true;
	} else if (params.filter_isActive === "false") {
		isActive = false;
	}

	return {
		// Si un seul statut, utiliser comme string pour le schema existant
		stockStatus:
			stockStatuses.length === 1
				? (stockStatuses[0] as "in_stock" | "low_stock" | "out_of_stock")
				: undefined,
		colorId: colorIds.length > 0 ? colorIds : undefined,
		materialId: materialIds.length > 0 ? materialIds : undefined,
		isActive,
	};
}

export async function generateMetadata({
	params,
}: ProductVariantsPageProps): Promise<Metadata> {
	const { slug } = await params;
	const product = await getProductBySlug({ slug, includeDraft: true });

	if (!product) {
		return {
			title: "Variantes - Administration",
		};
	}

	return {
		title: `Variantes de ${product.title} - Administration`,
		description: `Gerer les variantes du produit ${product.title}`,
	};
}

export default async function ProductVariantsPage({
	params,
	searchParams,
}: ProductVariantsPageProps) {
	const { slug } = await params;
	const searchParamsData = await searchParams;

	// Parse and validate all search parameters safely
	const { cursor, direction, perPage, sortBy, search } =
		parseProductSkuParams(searchParamsData);

	// Parse les filtres
	const filters = parseVariantFilters(searchParamsData);

	// Recuperer le produit
	const product = await getProductBySlug({
		slug,
		includeDraft: true,
	});

	if (!product) {
		notFound();
	}

	// Les options de filtre sont awaited car necessaires immediatement
	const [colorOptions, materialOptions] = await Promise.all([
		getColorOptions(),
		getMaterialOptions(),
	]);

	// La promise de SKUs n'est PAS awaited pour permettre le streaming
	const skusPromise = getProductSkus({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: {
			productId: product.id,
			...filters,
		},
	});

	return (
		<div className="space-y-6">
			<DeleteProductSkuAlertDialog />
			<AdjustStockDialog />
			<UpdatePriceDialog />
			<BulkAdjustStockDialog />
			<BulkUpdatePriceDialog />

			{/* Breadcrumb personnalise avec titre du produit */}
			<Breadcrumb className="hidden md:block">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/produits">Produits</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href={`/admin/catalogue/produits/${slug}/modifier`}>
							{product.title}
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Variantes</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				variant="compact"
				title={`Variantes de ${product.title}`}
				description="Gerez les differentes variantes de ce produit (couleur, taille, materiau, etc.)"
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link href={`/admin/catalogue/produits/${slug}/modifier`}>
								<ArrowLeft className="h-4 w-4 mr-2" />
								Modifier le produit
							</Link>
						</Button>
						<Button asChild>
							<Link href={`/admin/catalogue/produits/${slug}/variantes/nouveau`}>
								Nouvelle variante
							</Link>
						</Button>
					</div>
				}
			/>

			<div className="space-y-6">
				<Toolbar
					ariaLabel="Barre d'outils de gestion des variantes"
					search={
						<SearchInput mode="live" size="sm"
							paramName="search"
							placeholder="Rechercher une variante..."
							ariaLabel="Rechercher une variante"
							className="w-full"
						/>
					}
				>
					<SkusFilterSheet
						colorOptions={colorOptions}
						materialOptions={materialOptions}
					/>
					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={Object.entries(SORT_LABELS).map(([value, label]) => ({
							value,
							label,
						}))}
						placeholder="Plus recents"
						className="w-full sm:min-w-[180px]"
					/>
					<RefreshSkusButton productId={product.id} />
				</Toolbar>

				<SkusFilterBadges colors={colorOptions} materials={materialOptions} />

				<Suspense fallback={<SkusDataTableSkeleton />}>
					<ProductVariantsDataTable
						skusPromise={skusPromise}
						productSlug={slug}
						perPage={perPage}
					/>
				</Suspense>
			</div>
		</div>
	);
}
