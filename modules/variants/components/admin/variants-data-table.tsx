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
import type { GetProductVariantsReturn } from "@/modules/variants/types/variants.types";
import { getVariantMaterialsLabel } from "@/modules/variants/utils/variant-materials-label";
import { getVariantDisplayTitle } from "@/modules/variants/utils/variant-display-title";
import {
	getColorHexes,
	getColorNames,
	getVariantColorsDisplayLabel,
} from "@/modules/variants/utils/variant-colors-label";
import { buildSwatchStyle, getSwatchAriaLabel } from "@/modules/colors/utils/swatch-style";
import { formatEuro } from "@/shared/utils/format-euro";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { PackageIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";

import { ProductVariantRowActions } from "./variant-row-actions";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

// Schéma lean : le média vit sur le PRODUIT — vignette = première IMAGE du
// produit (filtre + ordre canonique portés par le select).
function getPrimaryImage(variant: GetProductVariantsReturn["productVariants"][number]) {
	return variant.product.media[0] ?? null;
}

// Helper pour calculer le stock disponible
function getAvailableStock(variant: { stock: number }): number {
	return variant.stock;
}

interface ProductVariantsDataTableProps {
	variantsPromise: Promise<GetProductVariantsReturn>;
	productSlug: string;
	perPage: number;
	/**
	 * Distingue « liste filtrée sans résultat » de « produit sans variante ».
	 *
	 * Sans ce prop, cette table était la seule des 11 listes admin à ignorer la
	 * distinction : une recherche infructueuse affichait « Ce produit n'a pas encore
	 * de variante » et proposait d'en créer une, au lieu de proposer d'effacer le
	 * filtre. Le pendant mobile (`variants-mobile-list.tsx`) le faisait déjà.
	 */
	hasActiveFilters?: boolean;
}

export async function ProductVariantsDataTable({
	variantsPromise,
	productSlug,
	perPage,
	hasActiveFilters = false,
}: ProductVariantsDataTableProps) {
	const { productVariants, pagination, representativeVariantId } = await variantsPromise;

	if (productVariants.length === 0) {
		return (
			<Card className="hidden md:block">
				<CardContent className="py-12">
					<TableEmptyState
						icon={PackageIcon}
						title="Aucune variante"
						description="Aucune variante ne correspond aux critères."
						noItemsDescription="Ce produit n'a pas encore de variante. Créez-en une pour commencer."
						hasActiveFilters={hasActiveFilters}
						resetFiltersHref={`/admin/catalogue/produits/${productSlug}/variantes`}
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
				currentPageSize: productVariants.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[10%]">Image</TableHead>
					<TableHead className="w-[20%]">Référence</TableHead>
					<TableHead className="w-[14%]">Couleur</TableHead>
					<TableHead className="w-[14%]">Matériau</TableHead>
					<TableHead className="w-[8%]">Taille</TableHead>
					<TableHead className="w-[12%] text-right">Prix</TableHead>
					<TableHead className="w-[12%] text-center">Stock</TableHead>
					<TableHead
						className="w-[10%] text-right"
						aria-label="Actions disponibles pour chaque variante"
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{productVariants.map((variant) => {
					const primaryImage = getPrimaryImage(variant);
					const availableStock = getAvailableStock(variant);
					const displayTitle = getVariantDisplayTitle({
						...variant,
						isRepresentative: variant.id === representativeVariantId,
					});

					return (
						<TableRow key={variant.id}>
							<TableCell className="py-3">
								<div className="bg-muted relative size-20 shrink-0 rounded-md">
									{primaryImage ? (
										primaryImage.type === "VIDEO" ? (
											<video
												className="h-full w-full rounded-md object-cover"
												muted
												loop
												playsInline
												preload="none"
												aria-label={primaryImage.alt ?? `Vidéo variante ${displayTitle}`}
											>
												<source src={primaryImage.url} type={getVideoMimeType(primaryImage.url)} />
												<track kind="captions" srcLang="fr" label="Français" default />
												Votre navigateur ne supporte pas la lecture de vidéos.
											</video>
										) : (
											<Image
												src={primaryImage.url}
												alt={primaryImage.alt ?? displayTitle}
												fill
												sizes="80px"
												quality={IMAGE_QUALITY.STANDARD}
												className="rounded-md object-cover"
											/>
										)
									) : (
										<div className="bg-muted flex h-full w-full items-center justify-center rounded-md">
											<PackageIcon className="text-muted-foreground size-8" />
										</div>
									)}
								</div>
							</TableCell>
							<TableCell>
								<div className="flex min-w-0 flex-col gap-1">
									{/* `truncate` : `table-fixed` + `whitespace-nowrap` laisserait
									    une référence longue déborder sur la colonne Couleur. */}
									<Link
										href={`/admin/catalogue/produits/${productSlug}/variantes/${variant.id}`}
										className="hover:text-primary focus-visible:ring-ring truncate rounded-md font-medium transition-colors outline-none focus-visible:ring-2"
										title={displayTitle}
									>
										{displayTitle}
									</Link>
									{variant.id === representativeVariantId && (
										<Badge variant="secondary" className="w-fit text-xs">
											Par défaut
										</Badge>
									)}
								</div>
							</TableCell>
							<TableCell>
								{(() => {
									const hexes = getColorHexes(variant.color);
									const names = getColorNames(variant.color);
									const label = getVariantColorsDisplayLabel(variant.color);
									if (!label) {
										return <span className="text-muted-foreground text-sm">—</span>;
									}
									return (
										<div className="flex min-w-0 items-center gap-2">
											<Tooltip>
												<TooltipTrigger
													render={
														<span
															className="border-border size-4 cursor-help rounded-full border-2 shadow-sm"
															style={buildSwatchStyle(hexes)}
															aria-label={`Couleur${names.length > 1 ? "s" : ""} : ${getSwatchAriaLabel(names)}`}
														/>
													}
												></TooltipTrigger>
												<TooltipContent>
													<p>{label}</p>
													<p className="text-muted-foreground text-xs">{hexes.join(" / ")}</p>
												</TooltipContent>
											</Tooltip>
											<span className="truncate text-sm" title={label}>
												{label}
											</span>
										</div>
									);
								})()}
							</TableCell>
							<TableCell>
								{(() => {
									const label = getVariantMaterialsLabel(variant.material);
									return label ? (
										<span className="block truncate text-sm" title={label}>
											{label}
										</span>
									) : (
										<span className="text-muted-foreground text-sm">—</span>
									);
								})()}
							</TableCell>
							<TableCell>
								{variant.size ? (
									<span className="text-sm">{variant.size}</span>
								) : (
									<span className="text-muted-foreground text-sm">—</span>
								)}
							</TableCell>
							<TableCell className="text-right">
								<span className="text-sm font-medium">
									{formatEuro(variant.priceCents ?? variant.product.priceCents)}
								</span>
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
								<ProductVariantRowActions
									variantId={variant.id}
									variantName={displayTitle}
									productSlug={productSlug}
									isRepresentative={variant.id === representativeVariantId}
									active={variant.active}
									stock={variant.stock}
									priceCents={variant.priceCents ?? variant.product.priceCents}
								/>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
