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
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { ProductRowActions } from "./product-row-actions";
import { ProductsSelectionToolbar } from "./products-selection-toolbar";
import { ProductsTableSelectionCell } from "./products-table-selection-cell";

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

	// Helper pour formater les prix en euros (format français)
	const formatPrice = (priceInCents: number) => {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
		}).format(priceInCents / 100);
	};

	// Helper pour obtenir la plage de prix (min-max)
	const getPriceRange = (product: (typeof products)[0]) => {
		if (!product.skus || product.skus.length === 0) return "—";
		const prices = product.skus.map((sku) => sku.priceInclTax);
		const minPrice = Math.min(...prices);
		const maxPrice = Math.max(...prices);

		if (minPrice === maxPrice) {
			return formatPrice(minPrice);
		}
		return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
	};

	if (products.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
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
							Créer un bijou
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
									className="w-[8%] sm:w-[5%]"
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
									className="hidden md:table-cell w-[10%]"
								>
									Image
								</TableHead>
								<TableHead
									key="title"
									scope="col"
									role="columnheader"
									className="w-[80%] sm:w-[45%] md:w-[35%] lg:w-[25%]"
								>
									Titre
								</TableHead>
								<TableHead
									key="type"
									scope="col"
									role="columnheader"
									className="hidden lg:table-cell w-[12%]"
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
									className="w-[12%] sm:w-[10%]"
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
								const variantsCount = skusCount > 1 ? skusCount - 1 : 0;
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
											className="hidden md:table-cell py-3"
										>
											<ViewTransition name={`admin-product-image-${product.slug}`}>
												<div className="w-20 h-20 relative shrink-0">
													{defaultImage ? (
														<Image
															src={defaultImage.url}
															alt={defaultImage.altText || product.title}
															fill
															sizes="80px"
															className="rounded-md object-cover"
														/>
													) : (
														<div className="flex w-full h-full items-center justify-center rounded-md bg-muted">
															<Package className="h-8 w-8 text-muted-foreground" />
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
														title={product.title}
													>
														{product.title}
													</Link>
												</ViewTransition>
											</div>
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
													<span className="text-sm text-muted-foreground">
														—
													</span>
												)}
											</div>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
											{variantsCount > 0 ? (
												<span className="text-sm font-medium">
													{variantsCount}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell role="gridcell" className="hidden lg:table-cell text-right">
											<span
												className="text-sm font-medium"
												title={priceRange}
											>
												{priceRange}
											</span>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden lg:table-cell text-center"
										>
											{totalStock === 0 ? (
												<Badge variant="destructive">0</Badge>
											) : (
												<span className="text-sm font-medium">
													{totalStock}
												</span>
											)}
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
