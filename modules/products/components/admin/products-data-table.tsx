// React & Next.js
import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";

// External packages
import { Package } from "lucide-react";

// Generated types
import { ProductStatus } from "@/app/generated/prisma";

// Shared components
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";

// Module imports
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { STOCK_THRESHOLDS } from "@/modules/products/constants/product";

// Local components
import { ProductRowActions } from "./product-row-actions";
import { ProductsSelectionToolbar } from "./products-selection-toolbar";
import { ProductsTableSelectionCell } from "./products-table-selection-cell";

// =============================================================================
// Constants
// =============================================================================

// Singleton pour le formatage des prix (évite de recréer Intl.NumberFormat à chaque appel)
const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) =>
	PRICE_FORMATTER.format(priceInCents / 100);

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
}

export async function ProductsDataTable({
	productsPromise,
}: ProductsDataTableProps) {
	const { products, pagination } = await productsPromise;
	const productIds = products.map((product) => product.id);

	// Helper pour obtenir le SKU par défaut selon la logique demandée
	const getDefaultSku = (product: (typeof products)[0]) => {
		if (!product.skus || product.skus.length === 0) return null;
		// Déjà trié par orderBy dans le SELECT: isDefault DESC, priceInclTax ASC
		return product.skus[0];
	};

	// Helper pour calculer le stock total
	const getTotalStock = (product: (typeof products)[0]) => {
		if (!product.skus || product.skus.length === 0) return 0;
		return product.skus.reduce((sum, sku) => sum + (sku.inventory || 0), 0);
	};

	// Helper pour obtenir l'image du SKU par défaut
	const getDefaultImage = (product: (typeof products)[0]) => {
		const defaultSku = getDefaultSku(product);
		if (!defaultSku?.images || defaultSku.images.length === 0) return null;
		return (
			defaultSku.images.find((img) => img.isPrimary) || defaultSku.images[0]
		);
	};

	// Helper pour obtenir la plage de prix (min-max)
	const getPriceRange = (product: (typeof products)[0]) => {
		if (!product.skus || product.skus.length === 0) return null;
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
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia>
						<Package />
					</EmptyMedia>
					<EmptyTitle>Aucun bijou trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun bijou ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button asChild variant="primary">
						<Link href="/admin/catalogue/produits/nouveau">
							Créer un produit
						</Link>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<ProductsSelectionToolbar products={products} />
				<TableScrollContainer>
					<Table
						role="table"
						aria-label="Liste des bijoux"
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead
									key="select"
									scope="col"
									role="columnheader"
									className="w-10 sm:w-[5%] lg:w-[4%]"
									aria-label="Sélection de produits"
								>
									<ProductsTableSelectionCell
										type="header"
										productIds={productIds}
									/>
								</TableHead>
								<TableHead
									key="image"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell w-[12%] lg:w-[8%]"
								>
									Image
								</TableHead>
								<TableHead
									key="title"
									scope="col"
									role="columnheader"
									className="w-auto sm:w-[30%] lg:w-[20%]"
								>
									Titre
								</TableHead>
								<TableHead
									key="status"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell w-[12%] lg:w-[10%]"
								>
									Statut
								</TableHead>
								<TableHead
									key="type"
									scope="col"
									role="columnheader"
									className="hidden lg:table-cell w-[10%]"
								>
									Type
								</TableHead>
								<TableHead
									key="variants"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell text-center w-[10%] lg:w-[8%]"
								>
									Variantes
								</TableHead>
								<TableHead
									key="price"
									scope="col"
									role="columnheader"
									className="hidden lg:table-cell w-[12%] text-right"
								>
									Prix
								</TableHead>
								<TableHead
									key="stock"
									scope="col"
									role="columnheader"
									className="hidden lg:table-cell text-center w-[8%]"
								>
									Stock
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-12 sm:w-[10%] lg:w-[8%]"
									aria-label="Actions disponibles pour chaque produit"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{products.map((product) => {
								const defaultImage = getDefaultImage(product);
								const totalStock = getTotalStock(product);
								const skusCount = product._count?.skus || 0;
								const priceRange = getPriceRange(product);

								return (
									<TableRow key={product.id}>
										<TableCell role="gridcell">
											<ProductsTableSelectionCell
												type="row"
												productId={product.id}
												productTitle={product.title}
											/>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell py-3"
										>
											<ViewTransition name={`admin-product-image-${product.slug}`}>
												<div className="w-20 h-20 relative shrink-0">
													{defaultImage ? (
														<Image
															src={defaultImage.url}
															alt={defaultImage.altText || product.title}
															fill
															sizes="80px"
															quality={80}
															className="rounded-md object-cover"
															placeholder={defaultImage.blurDataUrl ? "blur" : "empty"}
															blurDataURL={defaultImage.blurDataUrl ?? undefined}
														/>
													) : (
														<div
															className="flex w-full h-full items-center justify-center rounded-md bg-muted"
															aria-label="Aucune image disponible"
														>
															<Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
														</div>
													)}
												</div>
											</ViewTransition>
										</TableCell>
										<TableCell role="gridcell">
											<div className="overflow-hidden">
												<ViewTransition name={`admin-product-title-${product.slug}`}>
													<Link
														href={`/admin/catalogue/produits/${product.slug}/modifier`}
														className="font-semibold text-foreground hover:underline hover:text-foreground truncate block"
														title={`Modifier ${product.title}`}
														aria-label={`Modifier ${product.title}`}
													>
														{product.title}
													</Link>
												</ViewTransition>
											</div>
										</TableCell>
										<TableCell role="gridcell" className="hidden sm:table-cell">
											<Badge variant={STATUS_CONFIG[product.status].variant}>
												{STATUS_CONFIG[product.status].label}
											</Badge>
										</TableCell>
										<TableCell role="gridcell" className="hidden lg:table-cell">
											<div className="overflow-hidden">
												{product.type ? (
													<Badge
														variant="outline"
														className="truncate block"
														title={product.type.label}
													>
														{product.type.label}
													</Badge>
												) : (
													<span className="text-sm text-muted-foreground" aria-label="Type non défini">
														—
													</span>
												)}
											</div>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
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
												<span className="text-sm text-muted-foreground" aria-label="Aucune variante">
													—
												</span>
											)}
										</TableCell>
										<TableCell role="gridcell" className="hidden lg:table-cell text-right">
											<span
												className="text-sm font-medium"
												title={formatPriceDisplay(priceRange)}
												aria-label={formatPriceAriaLabel(priceRange)}
											>
												{formatPriceDisplay(priceRange)}
											</span>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden lg:table-cell text-center"
										>
											<Badge
												variant={
													totalStock === 0
														? "destructive"
														: totalStock <= STOCK_THRESHOLDS.LOW_STOCK
															? "warning"
															: "success"
												}
												aria-label={
													totalStock === 0
														? "Stock épuisé"
														: totalStock <= STOCK_THRESHOLDS.LOW_STOCK
															? `Stock faible : ${totalStock} en stock`
															: `${totalStock} en stock`
												}
											>
												{totalStock}
											</Badge>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
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
						perPage={products.length}
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
