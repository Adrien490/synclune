import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { getProductSkus } from "@/modules/skus/data/get-skus";
import { parseProductSkuParams } from "@/modules/skus/utils/parse-sku-params";
import { ProductVariantsDataTable } from "@/modules/skus/components/admin/skus-data-table";
import { SkusDataTableSkeleton } from "@/modules/skus/components/admin/skus-data-table-skeleton";
import { RefreshSkusButton } from "@/modules/skus/components/admin/refresh-skus-button";
import { DeleteProductSkuAlertDialog } from "@/modules/skus/components/admin/delete-sku-alert-dialog";
import { AdjustStockDialog } from "@/modules/skus/components/admin/adjust-stock-dialog";
import { UpdatePriceDialog } from "@/modules/skus/components/admin/update-price-dialog";

export type ProductVariantFiltersSearchParams = {
	// Add any variant-specific filters here if needed in the future
};

export type ProductVariantsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
} & ProductVariantFiltersSearchParams;

type ProductVariantsPageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<ProductVariantsSearchParams>;
};

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
		description: `Gérer les variantes du produit ${product.title}`,
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

	// Récupérer le produit
	const product = await getProductBySlug({
		slug,
		includeDraft: true,
	});

	if (!product) {
		notFound();
	}

	const skusPromise = getProductSkus({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: {
			productId: product.id,
		},
	});

	return (
		<>
			<DeleteProductSkuAlertDialog />
			<AdjustStockDialog />
			<UpdatePriceDialog />

			<PageHeader
				variant="compact"
				title={`Variantes de ${product.title}`}
				description="Gérez les différentes variantes de ce produit (couleur, taille, matériau, etc.)"
				actions={
					<Button asChild>
						<Link href={`/admin/catalogue/produits/${slug}/variantes/nouveau`}>
							Nouvelle variante
						</Link>
					</Button>
				}
			/>

			<div className="space-y-6">
				<DataTableToolbar ariaLabel="Barre d'outils de gestion des variantes">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<SearchForm
							paramName="search"
							placeholder="Rechercher une variante..."
						/>
					</div>
					<div className="flex items-center gap-2">
						<RefreshSkusButton productId={product.id} />
					</div>
				</DataTableToolbar>

				<Suspense fallback={<SkusDataTableSkeleton />}>
					<ProductVariantsDataTable
						skusPromise={skusPromise}
						productSlug={slug}
					/>
				</Suspense>
			</div>
		</>
	);
}
