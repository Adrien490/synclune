// React & Next.js
import Link from "next/link";

// External packages
import { Package } from "lucide-react";

// Generated types
import { ProductStatus } from "@/app/generated/prisma/client";

// Shared components
import { CursorPagination } from "@/shared/components/cursor-pagination";
import {
	BulkSelectionHeaderCheckbox,
	BulkSelectionProvider,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";

// Module imports
import { type GetProductsReturn } from "@/modules/products/data/get-products";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

// Local components
import { ProductImageCell } from "./product-image-cell";
import { ProductRowActions } from "./product-row-actions";
import { ProductsBulkActionsBar } from "./products-bulk-actions-bar";

// =============================================================================
// Constants
// =============================================================================

// Singleton pour le formatage des prix (évite de recréer Intl.NumberFormat à chaque appel)
const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) => PRICE_FORMATTER.format(priceInCents / 100);

// Labels et styles pour les badges de statut
const STATUS_CONFIG: Record<
	ProductStatus,
	{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
	[ProductStatus.PUBLIC]: { label: "Public", variant: "default" },
	[ProductStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[ProductStatus.ARCHIVED]: { label: "Archivé", variant: "outline" },
};

// =============================================================================
// Helpers
// =============================================================================

type ProductWithSkus = { skus: Array<{ priceInclTax: number; inventory: number }> };

const getTotalStock = (product: ProductWithSkus) => {
	return product.skus.reduce((sum, sku) => sum + (sku.inventory || 0), 0);
};

const getPriceRange = (product: ProductWithSkus) => {
	if (product.skus.length === 0) return null;

	const prices = product.skus.map((sku) => sku.priceInclTax);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);

	return { minPrice, maxPrice };
};

const formatPriceDisplay = (priceData: { minPrice: number; maxPrice: number } | null) => {
	if (!priceData) return "—";
	const { minPrice, maxPrice } = priceData;
	if (minPrice === maxPrice) {
		return formatPrice(minPrice);
	}
	return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
};

const formatPriceAriaLabel = (priceData: { minPrice: number; maxPrice: number } | null) => {
	if (!priceData) return "Prix non défini";
	const { minPrice, maxPrice } = priceData;
	if (minPrice === maxPrice) {
		return `Prix : ${formatPrice(minPrice)}`;
	}
	return `Prix : de ${formatPrice(minPrice)} à ${formatPrice(maxPrice)}`;
};

// =============================================================================
// Component
// =============================================================================

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
	collections = [],
}: ProductsDataTableProps) {
	const { products, pagination } = await productsPromise;

	if (products.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={Package}
				title="Aucun bijou trouvé"
				description="Aucun bijou ne correspond aux critères de recherche."
				hasActiveFilters={hasActiveFilters}
				noItemsDescription="Vous n'avez pas encore de bijou dans le catalogue."
				action={{
					label: "Créer un produit",
					href: "/admin/catalogue/produits/nouveau",
				}}
			/>
		);
	}

	const pageItemIds = products.map((p) => p.id);

	return (
		<Card className="hidden md:block">
			<CardContent>
				<BulkSelectionProvider pageItemIds={pageItemIds}>
					<ProductsBulkActionsBar collections={collections} />
					<TableScrollContainer>
						<Table
							aria-label="Liste des bijoux"
							striped
							noRegion
							className="min-w-full table-fixed"
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
									<TableHead
										className="w-[8%]"
										aria-label="Actions disponibles pour chaque produit"
									>
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.map((product) => {
									const totalStock = getTotalStock(product);
									const skusCount = product._count.skus || 0;
									const priceRange = getPriceRange(product);

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
												<Badge variant={STATUS_CONFIG[product.status].variant}>
													{STATUS_CONFIG[product.status].label}
												</Badge>
											</TableCell>
											<TableCell className="text-center">
												{skusCount > 0 ? (
													<Link
														href={`/admin/catalogue/produits/${product.slug}/variantes`}
														className="text-sm font-medium hover:underline"
														aria-label={`${skusCount} variante${skusCount > 1 ? "s" : ""} - Cliquer pour gerer`}
														title="Gerer les variantes"
													>
														{skusCount}
													</Link>
												) : (
													<span
														className="text-muted-foreground text-sm"
														aria-label="Aucune variante"
													>
														—
													</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												<span
													className="text-sm font-medium"
													title={formatPriceDisplay(priceRange)}
													aria-label={formatPriceAriaLabel(priceRange)}
												>
													{formatPriceDisplay(priceRange)}
												</span>
											</TableCell>
											<TableCell className="text-center">
												<Link
													href={`/admin/catalogue/produits/${product.slug}/variantes`}
													title="Gérer le stock des variantes"
													aria-label={
														totalStock === 0
															? "Stock épuisé - Gérer les variantes"
															: totalStock <= STOCK_THRESHOLDS.CRITICAL
																? `Stock critique : ${totalStock} - Gérer les variantes`
																: totalStock <= STOCK_THRESHOLDS.LOW
																	? `Stock faible : ${totalStock} - Gérer les variantes`
																	: `${totalStock} en stock - Gérer les variantes`
													}
												>
													<Badge
														variant={
															totalStock === 0
																? "destructive"
																: totalStock <= STOCK_THRESHOLDS.CRITICAL
																	? "destructive"
																	: totalStock <= STOCK_THRESHOLDS.LOW
																		? "warning"
																		: "success"
														}
														className="cursor-pointer hover:opacity-80"
													>
														{totalStock}
													</Badge>
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
						</Table>
					</TableScrollContainer>

					<div className="mt-4">
						<CursorPagination
							perPage={perPage}
							hasNextPage={pagination.hasNextPage}
							hasPreviousPage={pagination.hasPreviousPage}
							currentPageSize={products.length}
							nextCursor={pagination.nextCursor}
							prevCursor={pagination.prevCursor}
						/>
					</div>
				</BulkSelectionProvider>
			</CardContent>
		</Card>
	);
}
