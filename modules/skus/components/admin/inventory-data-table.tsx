import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";
import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { Boxes, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { InventoryRowActions } from "./inventory-row-actions";

interface InventoryDataTableProps {
	inventoryPromise: Promise<GetProductSkusReturn>;
}

// Formatter pour les prix (singleton)
const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) =>
	PRICE_FORMATTER.format(priceInCents / 100);

export async function InventoryDataTable({
	inventoryPromise,
}: InventoryDataTableProps) {
	const { productSkus, pagination } = await inventoryPromise;

	const getPrimaryImage = (sku: (typeof productSkus)[0]) => {
		if (!sku.images || sku.images.length === 0) return null;
		return sku.images.find((img) => img.isPrimary) || sku.images[0];
	};

	if (productSkus.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Boxes />
					</EmptyMedia>
					<EmptyTitle>Aucun article en inventaire</EmptyTitle>
					<EmptyDescription>
						Aucun article ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<TableScrollContainer>
					<Table
						role="table"
						aria-label="Inventaire des produits"
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead
									scope="col"
									className="hidden sm:table-cell w-[12%] lg:w-[8%]"
								>
									Image
								</TableHead>
								<TableHead scope="col" className="w-auto sm:w-[35%] lg:w-[25%]">
									Produit
								</TableHead>
								<TableHead
									scope="col"
									className="hidden sm:table-cell w-[15%] lg:w-[12%]"
								>
									Couleur
								</TableHead>
								<TableHead
									scope="col"
									className="hidden lg:table-cell w-[12%]"
								>
									Matériau
								</TableHead>
								<TableHead scope="col" className="text-center w-[15%] sm:w-[10%]">
									Stock
								</TableHead>
								<TableHead
									scope="col"
									className="hidden sm:table-cell text-right w-[12%]"
								>
									Prix
								</TableHead>
								<TableHead
									scope="col"
									className="w-12 sm:w-[10%] lg:w-[8%]"
									aria-label="Actions"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{productSkus.map((sku) => {
								const primaryImage = getPrimaryImage(sku);
								const availableStock = sku.inventory;

								return (
									<TableRow key={sku.id}>
										{/* Image - 80x80 comme products */}
										<TableCell className="hidden sm:table-cell py-3">
											<ViewTransition name={`admin-sku-image-${sku.id}`}>
												<div className="w-20 h-20 relative shrink-0">
													{primaryImage ? (
														primaryImage.mediaType === "VIDEO" ? (
															<video
																className="w-full h-full rounded-md object-cover"
																muted
																loop
																playsInline
																preload="none"
																aria-label={
																	primaryImage.altText ||
																	`Vidéo ${sku.product.title}`
																}
															>
																<source
																	src={primaryImage.url}
																	type={getVideoMimeType(primaryImage.url)}
																/>
															</video>
														) : (
															<Image
																src={primaryImage.url}
																alt={primaryImage.altText || sku.product.title}
																fill
																sizes="80px"
																quality={80}
																className="rounded-md object-cover"
																placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
																blurDataURL={primaryImage.blurDataUrl ?? undefined}
															/>
														)
													) : (
														<div
															className="flex w-full h-full items-center justify-center rounded-md bg-muted"
															aria-label="Aucune image"
														>
															<Package className="h-8 w-8 text-muted-foreground" />
														</div>
													)}
												</div>
											</ViewTransition>
										</TableCell>

										{/* Produit - titre avec variante */}
										<TableCell>
											<div className="overflow-hidden">
												<ViewTransition name={`admin-sku-${sku.id}`}>
													<Link
														href={`/admin/catalogue/produits/${sku.product.slug}/variantes`}
														className="font-semibold text-foreground hover:underline truncate block"
														title={`Voir toutes les variantes de ${sku.product.title}`}
													>
														{sku.product.title}
													</Link>
												</ViewTransition>
												<Link
													href={`/admin/catalogue/produits/${sku.product.slug}/variantes/${sku.id}/modifier`}
													className="text-sm text-muted-foreground hover:underline truncate block"
													title={`Modifier ${sku.sku}`}
												>
													{sku.sku}
													{sku.size && ` · ${sku.size}`}
												</Link>
												{!sku.isActive && (
													<Badge variant="secondary" className="mt-1 text-xs">
														Inactif
													</Badge>
												)}
											</div>
										</TableCell>

										{/* Couleur */}
										<TableCell className="hidden sm:table-cell">
											{sku.color ? (
												<div className="flex items-center gap-2">
													<Tooltip>
														<TooltipTrigger asChild>
															<span
																className="w-5 h-5 rounded-full border border-border shadow-sm cursor-help shrink-0"
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
													<span className="text-sm truncate">{sku.color.name}</span>
												</div>
											) : (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</TableCell>

										{/* Matériau */}
										<TableCell className="hidden lg:table-cell">
											{sku.material ? (
												<span className="text-sm truncate block">
													{sku.material.name}
												</span>
											) : (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</TableCell>

										{/* Stock - colonne centrale de l'inventaire */}
										<TableCell className="text-center">
											<Badge
												variant={
													availableStock === 0
														? "destructive"
														: availableStock <= STOCK_THRESHOLDS.LOW
															? "warning"
															: "success"
												}
												className="text-sm font-semibold"
												aria-label={
													availableStock === 0
														? "Rupture de stock"
														: availableStock <= STOCK_THRESHOLDS.LOW
															? `Stock faible : ${availableStock}`
															: `${availableStock} en stock`
												}
											>
												{availableStock}
											</Badge>
										</TableCell>

										{/* Prix */}
										<TableCell className="hidden sm:table-cell text-right">
											<span className="text-sm font-medium">
												{formatPrice(sku.priceInclTax)}
											</span>
											{sku.compareAtPrice && sku.compareAtPrice > sku.priceInclTax && (
												<span className="text-xs text-muted-foreground line-through ml-1">
													{formatPrice(sku.compareAtPrice)}
												</span>
											)}
										</TableCell>

										{/* Actions */}
										<TableCell className="text-right">
											<InventoryRowActions
												skuId={sku.id}
												skuName={sku.sku}
												productSlug={sku.product.slug}
												inventory={sku.inventory}
												priceInclTax={sku.priceInclTax}
												compareAtPrice={sku.compareAtPrice}
												isActive={sku.isActive}
												isDefault={sku.isDefault}
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
						perPage={productSkus.length}
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
