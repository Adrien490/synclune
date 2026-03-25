// React & Next.js
import Link from "next/link";

// External packages
import { Package } from "lucide-react";

// Generated types
import { ProductStatus } from "@/app/generated/prisma/client";

// Shared components
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
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
import { ProductsSelectionToolbar } from "./products-selection-toolbar";
import { TableSelectionCell } from "@/shared/components/table-selection-cell";

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

interface ProductsDataTableProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
}

export async function ProductsDataTable({ productsPromise, perPage }: ProductsDataTableProps) {
	const { products, pagination } = await productsPromise;
	const productIds = products.map((product) => product.id);

	// Helper pour obtenir le SKU par défaut selon la logique demandée
	const getDefaultSku = (product: (typeof products)[0]) => {
		// Déjà trié par orderBy dans le SELECT: isDefault DESC, priceInclTax ASC
		return product.skus[0];
	};

	// Helper pour calculer le stock total
	const getTotalStock = (product: (typeof products)[0]) => {
		return product.skus.reduce((sum, sku) => sum + (sku.inventory || 0), 0);
	};

	// Helper pour obtenir la plage de prix (min-max)
	const getPriceRange = (product: (typeof products)[0]) => {
		const prices = product.skus.map((sku) => sku.priceInclTax);
		const minPrice = Math.min(...prices);
		const maxPrice = Math.max(...prices);

		return { minPrice, maxPrice };
	};

	// Helper pour formater l'affichage du prix
	const formatPriceDisplay = (priceData: { minPrice: number; maxPrice: number } | null) => {
		if (!priceData) return "—";
		const { minPrice, maxPrice } = priceData;
		if (minPrice === maxPrice) {
			return formatPrice(minPrice);
		}
		return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
	};

	// Helper pour formater l'aria-label du prix (lecteurs d'écran)
	const formatPriceAriaLabel = (priceData: { minPrice: number; maxPrice: number } | null) => {
		if (!priceData) return "Prix non défini";
		const { minPrice, maxPrice } = priceData;
		if (minPrice === maxPrice) {
			return `Prix : ${formatPrice(minPrice)}`;
		}
		return `Prix : de ${formatPrice(minPrice)} à ${formatPrice(maxPrice)}`;
	};

	if (products.length === 0) {
		return (
			<TableEmptyState
				icon={Package}
				title="Aucun bijou trouvé"
				description="Aucun bijou ne correspond aux critères de recherche."
				action={{
					label: "Créer un produit",
					href: "/admin/catalogue/produits/nouveau",
				}}
			/>
		);
	}

	return (
		<Card className="hidden md:block">
			<CardContent>
				<ProductsSelectionToolbar products={products} />
				<TableScrollContainer>
					<Table
						aria-label="Liste des bijoux"
						caption="Liste des produits"
						striped
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[4%]" aria-label="Sélection de produits">
									<TableSelectionCell type="header" itemIds={productIds} />
								</TableHead>
								<TableHead className="w-[8%]">Image</TableHead>
								<TableHead className="w-[22%]">Titre</TableHead>
								<TableHead className="w-[10%]">Statut</TableHead>
								<TableHead className="w-[8%] text-center">Variantes</TableHead>
								<TableHead className="w-[14%] text-right">Prix</TableHead>
								<TableHead className="w-[8%] text-center">Stock</TableHead>
								<TableHead className="w-[8%]" aria-label="Actions disponibles pour chaque produit">
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
										<TableCell>
											<TableSelectionCell
												type="row"
												itemId={product.id}
												ariaLabel={`Sélectionner ${product.title}`}
											/>
										</TableCell>
										<TableCell className="py-3">
											<ProductImageCell
												images={getDefaultSku(product)?.images ?? []}
												productTitle={product.title}
											/>
										</TableCell>
										<TableCell>
											<div className="overflow-hidden">
												<Link
													href={`/admin/catalogue/produits/${product.slug}/modifier`}
													className="text-foreground hover:text-foreground block truncate font-semibold hover:underline"
													title={`Modifier ${product.title}`}
													aria-label={`Modifier ${product.title}`}
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
											<Badge
												variant={
													totalStock === 0
														? "destructive"
														: totalStock <= STOCK_THRESHOLDS.LOW
															? "warning"
															: "success"
												}
												aria-label={
													totalStock === 0
														? "Stock épuisé"
														: totalStock <= STOCK_THRESHOLDS.LOW
															? `Stock faible : ${totalStock} en stock`
															: `${totalStock} en stock`
												}
											>
												{totalStock}
											</Badge>
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
			</CardContent>
		</Card>
	);
}
