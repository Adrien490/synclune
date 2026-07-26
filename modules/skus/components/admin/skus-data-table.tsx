import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";
import { getSkuMaterialsLabel } from "@/modules/skus/utils/sku-materials-label";
import {
	getColorHexes,
	getColorNames,
	getSkuColorsDisplayLabel,
} from "@/modules/skus/utils/sku-colors-label";
import { buildSwatchStyle, getSwatchAriaLabel } from "@/modules/colors/utils/swatch-style";
import { formatEuro } from "@/shared/utils/format-euro";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductSkuRowActions } from "./sku-row-actions";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

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

	// Helper pour obtenir l'image primaire
	const getPrimaryImage = (sku: (typeof productSkus)[0]) => {
		if (sku.images.length === 0) return null;
		return sku.images.find((img) => img.isPrimary) ?? sku.images[0];
	};

	// Helper pour calculer le stock disponible
	const getAvailableStock = (sku: (typeof productSkus)[0]) => {
		return sku.inventory;
	};

	if (productSkus.length === 0) {
		return (
			<Card className="hidden md:block">
				<CardContent className="py-12">
					<TableEmptyState
						icon={Package}
						title="Aucune variante"
						description="Ce produit n'a pas encore de variante. Créez-en une pour commencer."
						action={{
							label: "Créer une variante",
							href: `/admin/catalogue/produits/${productSlug}/variantes/nouveau`,
						}}
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<AdminDataTable
			caption="Liste des variantes"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: productSkus.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[8%]">Image</TableHead>
					<TableHead className="w-[16%]">Référence</TableHead>
					<TableHead className="w-[12%]">Couleur</TableHead>
					<TableHead className="w-[12%]">Matériau</TableHead>
					<TableHead className="w-[8%]">Taille</TableHead>
					<TableHead className="w-[12%]">Prix</TableHead>
					<TableHead className="w-[10%] text-center">Stock</TableHead>
					<TableHead
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
							<TableCell>
								{sku.isDefault ? (
									<span
										className="text-muted-foreground inline-flex size-4 items-center justify-center text-xs"
										aria-label="Variante par défaut, non sélectionnable"
										title="Variante par défaut"
									>
										★
									</span>
								) : null}
							</TableCell>
							<TableCell className="py-3">
								<div className="bg-muted relative size-20 shrink-0 rounded-md">
									{primaryImage ? (
										primaryImage.mediaType === "VIDEO" ? (
											<video
												className="h-full w-full rounded-md object-cover"
												muted
												loop
												playsInline
												preload="none"
												aria-label={primaryImage.altText ?? `Vidéo variante ${sku.sku}`}
											>
												<source src={primaryImage.url} type={getVideoMimeType(primaryImage.url)} />
												<track kind="captions" srcLang="fr" label="Français" default />
												Votre navigateur ne supporte pas la lecture de vidéos.
											</video>
										) : (
											<Image
												src={primaryImage.url}
												alt={primaryImage.altText ?? sku.sku}
												fill
												sizes="80px"
												quality={IMAGE_QUALITY.STANDARD}
												className="rounded-md object-cover"
												placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
												blurDataURL={primaryImage.blurDataUrl ?? undefined}
											/>
										)
									) : (
										<div className="bg-muted flex h-full w-full items-center justify-center rounded-md">
											<Package className="text-muted-foreground size-8" />
										</div>
									)}
								</div>
							</TableCell>
							<TableCell>
								<div className="flex flex-col gap-1">
									<Link
										href={`/admin/catalogue/produits/${productSlug}/variantes/${sku.id}`}
										className="hover:text-primary focus-visible:ring-ring rounded-md font-medium transition-colors outline-none focus-visible:ring-2"
									>
										{sku.sku}
									</Link>
									{sku.isDefault && (
										<Badge variant="secondary" className="w-fit text-xs">
											Par défaut
										</Badge>
									)}
								</div>
							</TableCell>
							<TableCell>
								{(() => {
									const hexes = getColorHexes(sku.colors);
									const names = getColorNames(sku.colors);
									const label = getSkuColorsDisplayLabel(sku.colors);
									if (!label) {
										return <span className="text-muted-foreground text-sm">—</span>;
									}
									return (
										<div className="flex items-center gap-2">
											<Tooltip>
												<TooltipTrigger asChild>
													<span
														className="border-border size-4 cursor-help rounded-full border-2 shadow-sm"
														style={buildSwatchStyle(hexes)}
														aria-label={`Couleur${names.length > 1 ? "s" : ""} : ${getSwatchAriaLabel(names)}`}
													/>
												</TooltipTrigger>
												<TooltipContent>
													<p>{label}</p>
													<p className="text-muted-foreground text-xs">{hexes.join(" / ")}</p>
												</TooltipContent>
											</Tooltip>
											<span className="text-sm">{label}</span>
										</div>
									);
								})()}
							</TableCell>
							<TableCell>
								{(() => {
									const label = getSkuMaterialsLabel(sku.materials);
									return label ? (
										<span className="text-sm">{label}</span>
									) : (
										<span className="text-muted-foreground text-sm">—</span>
									);
								})()}
							</TableCell>
							<TableCell>
								{sku.size ? (
									<span className="text-sm">{sku.size}</span>
								) : (
									<span className="text-muted-foreground text-sm">—</span>
								)}
							</TableCell>
							<TableCell>
								<span className="text-sm font-bold">{formatEuro(sku.priceInclTax)}</span>
							</TableCell>
							<TableCell className="text-center">
								<Badge
									variant={getStockVariant(availableStock)}
									aria-label={getStockAriaLabel(availableStock)}
								>
									{availableStock}
								</Badge>
							</TableCell>
							<TableCell className="text-right">
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
		</AdminDataTable>
	);
}
