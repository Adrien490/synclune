// React & Next.js
import Link from "next/link";

// External packages
import { Archive, FileEdit, Globe, Package, type LucideIcon } from "lucide-react";

// Generated types
import { ProductStatus } from "@/app/generated/prisma/client";

// Shared components
import {
	AdminDataTable,
	BulkSelectionHeaderCheckbox,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
import { Badge } from "@/shared/components/ui/badge";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";

// Module imports
import {
	PRODUCT_STATUS_LABELS,
	PRODUCT_STATUS_VARIANTS,
} from "@/modules/products/constants/product-status-display";
import { type GetProductsReturn } from "@/modules/products/data/get-products";
import { calculatePriceInfo } from "@/modules/products/services/product-pricing.service";
import {
	formatPriceRangeAriaLabel,
	formatPriceRangeDisplay,
} from "@/modules/products/utils/format-price-range";
import { getProductTotalStock } from "@/modules/products/utils/get-product-total-stock";

// Local components
import { ProductImageCell } from "./product-image-cell";
import { ProductRowActions } from "./product-row-actions";
import { ProductsBulkActionsBar } from "./products-bulk-actions-bar";

const PRODUCT_STATUS_ICONS: Record<ProductStatus, LucideIcon> = {
	[ProductStatus.PUBLIC]: Globe,
	[ProductStatus.DRAFT]: FileEdit,
	[ProductStatus.ARCHIVED]: Archive,
};

const EMPTY_COLLECTIONS: Array<{ id: string; name: string }> = [];

interface ProductsDataTableProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	/** Collections disponibles pour le bulk-attach (sheet "Lier à une collection"). */
	collections?: Array<{ id: string; name: string }>;
}

export async function ProductsDataTable({
	productsPromise,
	perPage,
	hasActiveFilters,
	collections = EMPTY_COLLECTIONS,
}: ProductsDataTableProps) {
	const { products, pagination, totalCount } = await productsPromise;

	if (products.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={Package}
				title="Aucun bijou trouvé"
				description="Aucun bijou ne correspond aux critères de recherche."
				hasActiveFilters={hasActiveFilters}
				noItemsDescription="Vous n'avez pas encore de bijou dans le catalogue."
				resetFiltersHref="/admin/catalogue/produits"
				action={{
					label: "Créer un produit",
					href: "/admin/catalogue/produits/nouveau",
				}}
			/>
		);
	}

	const pageItemIds = products.map((p) => p.id);

	return (
		<AdminDataTable
			caption="Liste des bijoux"
			pageItemIds={pageItemIds}
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: products.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
			bulkActionsBar={<ProductsBulkActionsBar collections={collections} />}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[4%]">
						<BulkSelectionHeaderCheckbox itemsLabel="bijoux" />
						<span className="sr-only">Sélection</span>
					</TableHead>
					<TableHead className="w-[8%]">Image</TableHead>
					<TableHead className="w-[20%]">Titre</TableHead>
					<TableHead className="w-[10%]">Statut</TableHead>
					<TableHead className="w-[8%] text-center">Variantes</TableHead>
					<TableHead className="w-[12%] text-right">Prix</TableHead>
					<TableHead className="w-[8%] text-center">Stock</TableHead>
					<TableHead className="w-[8%]" aria-label="Actions disponibles pour chaque produit">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{products.map((product) => {
					const totalStock = getProductTotalStock(product.skus);
					const skusCount = product._count.skus || 0;
					const priceInfo = calculatePriceInfo(product.skus);

					return (
						<TableRow key={product.id}>
							<TableCell className="py-3">
								<BulkSelectionRowCheckbox id={product.id} itemLabel={product.title} />
							</TableCell>
							<TableCell className="py-3">
								<ProductImageCell
									images={product.skus[0]?.images ?? []}
									productTitle={product.title}
								/>
							</TableCell>
							<TableCell>
								<div className="overflow-hidden">
									<Link
										href={`/admin/catalogue/produits/${product.slug}`}
										className="text-foreground hover:text-foreground block truncate font-semibold hover:underline"
										title={`Voir ${product.title}`}
										aria-label={`Voir ${product.title}`}
									>
										{product.title}
									</Link>
								</div>
							</TableCell>
							<TableCell>
								{(() => {
									const label = PRODUCT_STATUS_LABELS[product.status];
									const Icon = PRODUCT_STATUS_ICONS[product.status];
									return (
										<Badge
											variant={PRODUCT_STATUS_VARIANTS[product.status]}
											role="status"
											aria-label={`Statut : ${label}`}
										>
											<Icon aria-hidden="true" />
											{label}
										</Badge>
									);
								})()}
							</TableCell>
							<TableCell className="text-center">
								{skusCount === 0 ? (
									<span className="text-muted-foreground text-sm" aria-label="Aucune variante">
										—
									</span>
								) : skusCount === 1 ? (
									<Link
										href={`/admin/catalogue/produits/${product.slug}/variantes`}
										className="text-muted-foreground text-xs hover:underline"
										aria-label="Une seule variante — Voir la variante"
										title="Voir la variante"
									>
										Variante unique
									</Link>
								) : (
									<Link
										href={`/admin/catalogue/produits/${product.slug}/variantes`}
										className="text-sm font-medium hover:underline"
										aria-label={`${skusCount} variantes - Cliquer pour gerer`}
										title="Gerer les variantes"
									>
										{skusCount}
									</Link>
								)}
							</TableCell>
							<TableCell className="text-right">
								<span
									className="text-sm font-medium"
									title={formatPriceRangeDisplay(priceInfo)}
									aria-label={formatPriceRangeAriaLabel(priceInfo)}
								>
									{formatPriceRangeDisplay(priceInfo)}
								</span>
							</TableCell>
							<TableCell className="text-center">
								<Link
									href={`/admin/catalogue/produits/${product.slug}/variantes`}
									title="Gérer le stock des variantes"
									aria-label={`${getStockAriaLabel(totalStock)} — Gérer les variantes`}
								>
									<Badge variant={getStockVariant(totalStock)}>{totalStock}</Badge>
								</Link>
							</TableCell>
							<TableCell className="text-right">
								<ProductRowActions
									productId={product.id}
									productSlug={product.slug}
									productTitle={product.title}
									productStatus={product.status}
								/>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
