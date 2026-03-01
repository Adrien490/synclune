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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { Package } from "lucide-react";
import Image from "next/image";
import { ProductSkuRowActions } from "./sku-row-actions";
import { ProductVariantsSelectionToolbar } from "./skus-selection-toolbar";
import { TableSelectionCell } from "@/shared/components/table-selection-cell";

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
					<Table
						role="table"
						aria-label="Liste des variantes du produit"
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead
									key="select"
									scope="col"
									role="columnheader"
									className="w-12"
									aria-label="Sélection de variantes"
								>
									<TableSelectionCell type="header" itemIds={variantIds} />
								</TableHead>
								<TableHead
									key="image"
									scope="col"
									role="columnheader"
									className="hidden w-20 md:table-cell"
								>
									Image
								</TableHead>
								<TableHead key="sku" scope="col" role="columnheader" className="w-[20%]">
									Référence
								</TableHead>
								<TableHead
									key="color"
									scope="col"
									role="columnheader"
									className="hidden w-[12%] sm:table-cell"
								>
									Couleur
								</TableHead>
								<TableHead
									key="material"
									scope="col"
									role="columnheader"
									className="hidden w-[12%] xl:table-cell"
								>
									Matériau
								</TableHead>
								<TableHead
									key="size"
									scope="col"
									role="columnheader"
									className="hidden w-[8%] 2xl:table-cell"
								>
									Taille
								</TableHead>
								<TableHead key="price" scope="col" role="columnheader" className="w-[12%]">
									Prix
								</TableHead>
								<TableHead
									key="stock"
									scope="col"
									role="columnheader"
									className="hidden w-[10%] text-center sm:table-cell"
								>
									Stock
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[8%] text-right"
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
											<TableSelectionCell type="row" itemId={sku.id} />
										</TableCell>
										<TableCell role="gridcell" className="hidden py-3 md:table-cell">
											<div className="bg-muted relative h-20 w-20 shrink-0 rounded-md">
												{primaryImage ? (
													primaryImage.mediaType === "VIDEO" ? (
														<video
															className="h-full w-full rounded-md object-cover"
															muted
															loop
															playsInline
															preload="none"
															aria-label={primaryImage.altText || `Vidéo variante ${sku.sku}`}
														>
															<source
																src={primaryImage.url}
																type={getVideoMimeType(primaryImage.url)}
															/>
															<track kind="captions" srcLang="fr" label="Français" default />
															Votre navigateur ne supporte pas la lecture de vidéos.
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
													<div className="bg-muted flex h-full w-full items-center justify-center rounded-md">
														<Package className="text-muted-foreground h-8 w-8" />
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
																className="border-border h-4 w-4 cursor-help rounded-full border-2 shadow-sm"
																style={{ backgroundColor: sku.color.hex }}
																aria-label={`Couleur : ${sku.color.name}`}
															/>
														</TooltipTrigger>
														<TooltipContent>
															<p>{sku.color.name}</p>
															<p className="text-muted-foreground text-xs">{sku.color.hex}</p>
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
										<TableCell role="gridcell" className="hidden 2xl:table-cell">
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
										<TableCell role="gridcell" className="hidden text-center sm:table-cell">
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
