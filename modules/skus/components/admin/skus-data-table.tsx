import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";
import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductSkuActiveToggle } from "./sku-active-toggle";
import { ProductSkuRowActions } from "./sku-row-actions";
import { ProductVariantsSelectionToolbar } from "./skus-selection-toolbar";
import { ProductVariantsTableSelectionCell } from "./skus-table-selection-cell";

interface ProductVariantsDataTableProps {
	skusPromise: Promise<GetProductSkusReturn>;
	productSlug: string;
	perPage: number;
}

export async function ProductVariantsDataTable({
	skusPromise,
	productSlug,
	perPage,
}: ProductVariantsDataTableProps) {
	const { productSkus, pagination } = await skusPromise;
	const variantIds = productSkus.map((sku) => sku.id);

	// Helper pour obtenir l'image primaire
	const getPrimaryImage = (sku: (typeof productSkus)[0]) => {
		if (!sku.images || sku.images.length === 0) return null;
		return sku.images.find((img) => img.isPrimary) || sku.images[0];
	};

	// Helper pour calculer le stock disponible
	const getAvailableStock = (sku: (typeof productSkus)[0]) => {
		return sku.inventory;
	};

	if (productSkus.length === 0) {
		return (
			<Card>
				<CardContent className="py-12">
					<TableEmptyState
						icon={Package}
						title="Aucune variante"
						description="Ce produit n'a pas encore de variante. Creez-en une pour commencer."
						action={{
							label: "Creer une variante",
							href: `/admin/catalogue/produits/${productSlug}/variantes/nouveau`,
						}}
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent>
				<ProductVariantsSelectionToolbar />
				<TableScrollContainer>
					<Table role="table" aria-label="Liste des variantes du produit" className="min-w-full">
						<TableHeader>
							<TableRow>
								<TableHead
									key="select"
									scope="col"
									role="columnheader"
									className="w-12"
									aria-label="Sélection de variantes"
								>
									<ProductVariantsTableSelectionCell
										type="header"
										variantIds={variantIds}
									/>
								</TableHead>
								<TableHead
									key="image"
									scope="col"
									role="columnheader"
									className="hidden md:table-cell w-20"
								>
									Image
								</TableHead>
								<TableHead key="sku" scope="col" role="columnheader">
									Référence
								</TableHead>
								<TableHead
									key="color"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell"
								>
									Couleur
								</TableHead>
								<TableHead
									key="material"
									scope="col"
									role="columnheader"
									className="hidden xl:table-cell"
								>
									Matériau
								</TableHead>
								<TableHead
									key="size"
									scope="col"
									role="columnheader"
									className="hidden 2xl:table-cell"
								>
									Taille
								</TableHead>
								<TableHead key="price" scope="col" role="columnheader">
									Prix
								</TableHead>
								<TableHead
									key="stock"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell text-center"
								>
									Stock
								</TableHead>
									<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="text-right"
									aria-label="Actions disponibles pour chaque variante"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
								{productSkus.map((sku) => {
								const primaryImage = getPrimaryImage(sku);
								const availableStock = getAvailableStock(sku);

								return (
									<TableRow key={sku.id}>
										<TableCell role="gridcell">
											<ProductVariantsTableSelectionCell
												type="row"
												variantId={sku.id}
											/>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden md:table-cell py-3"
										>
											<div className="w-20 h-20 relative shrink-0 bg-muted rounded-md">
												{primaryImage ? (
													primaryImage.mediaType === "VIDEO" ? (
														<video
															className="w-full h-full rounded-md object-cover"
															muted
															loop
															playsInline
															preload="none"
															aria-label={primaryImage.altText || `Vidéo variante ${sku.sku}`}
														>
															<source src={primaryImage.url} type={getVideoMimeType(primaryImage.url)} />
															Ton navigateur ne supporte pas la lecture de vidéos.
														</video>
													) : (
														<Image
															src={primaryImage.url}
															alt={primaryImage.altText || sku.sku}
															fill
															sizes="80px"
															quality={80}
															className="rounded-md object-cover"
															placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
															blurDataURL={primaryImage.blurDataUrl ?? undefined}
														/>
													)
												) : (
													<div className="flex w-full h-full items-center justify-center rounded-md bg-muted">
														<Package className="h-8 w-8 text-muted-foreground" />
													</div>
												)}
											</div>
										</TableCell>
										<TableCell role="gridcell">
											<div className="flex flex-col gap-1">
												<span className="font-medium">{sku.sku}</span>
												{sku.isDefault && (
													<Badge variant="secondary" className="w-fit text-xs">
														Par défaut
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell role="gridcell" className="hidden sm:table-cell">
											{sku.color ? (
												<div className="flex items-center gap-2">
													<Tooltip>
														<TooltipTrigger asChild>
															<span
																className="w-4 h-4 rounded-full border-2 border-border shadow-sm cursor-help"
																style={{ backgroundColor: sku.color.hex }}
																aria-label={`Couleur : ${sku.color.name}`}
															/>
														</TooltipTrigger>
														<TooltipContent>
															<p>{sku.color.name}</p>
															<p className="text-xs text-muted-foreground">
																{sku.color.hex}
															</p>
														</TooltipContent>
													</Tooltip>
													<span className="text-sm">{sku.color.name}</span>
												</div>
											) : (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</TableCell>
										<TableCell role="gridcell" className="hidden xl:table-cell">
											{sku.material ? (
												<span className="text-sm">{sku.material.name}</span>
											) : (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden 2xl:table-cell"
										>
											{sku.size ? (
												<span className="text-sm">{sku.size}</span>
											) : (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</TableCell>
										<TableCell role="gridcell">
											<span className="text-sm font-bold">
												{(sku.priceInclTax / 100).toFixed(2)} €
											</span>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
											<Badge
												variant={
													availableStock === 0
														? "destructive"
														: availableStock <= STOCK_THRESHOLDS.LOW
															? "warning"
															: "success"
												}
												aria-label={
													availableStock === 0
														? "Stock épuisé"
														: availableStock <= STOCK_THRESHOLDS.LOW
															? `Stock faible : ${availableStock} disponible(s)`
															: `${availableStock} en stock`
												}
											>
												{availableStock}
											</Badge>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
											<ProductSkuRowActions
												skuId={sku.id}
												skuName={sku.sku}
												productSlug={productSlug}
												isDefault={sku.isDefault}
												isActive={sku.isActive}
												inventory={sku.inventory}
												priceInclTax={sku.priceInclTax}
												compareAtPrice={sku.compareAtPrice}
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
						currentPageSize={productSkus.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
