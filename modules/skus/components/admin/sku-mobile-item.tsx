"use client";

import { PackageIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { formatEuro } from "@/shared/utils/format-euro";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";

import { useSkuActions } from "@/modules/skus/hooks/use-sku-actions";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";
import {
	getSkuDisplayTitle,
	getSkuDisplayTitleSpoken,
} from "@/modules/skus/utils/sku-display-title";
import { getColorHexes } from "@/modules/skus/utils/sku-colors-label";
import { buildSwatchStyle } from "@/modules/colors/utils/swatch-style";
import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";

type Sku = GetProductSkusReturn["productSkus"][number];

interface SkuMobileItemProps {
	sku: Sku;
	productSlug: string;
	/** Premier item ATF : déclenche preload SSR (LCP candidate). */
	preload?: boolean;
}

export function SkuMobileItem({ sku, productSlug, preload }: SkuMobileItemProps) {
	const primaryImage = sku.images.find((img) => img.isPrimary) ?? sku.images[0] ?? null;
	// Une vidéo sans poster n'est pas décodable par l'optimiseur -> icône de secours.
	// Remplace l'ancien `unoptimized` qui servait une URL .mp4 à `next/image`.
	const thumbSrc = primaryImage ? resolveMediaThumbSrc(primaryImage) : null;
	const stockVariant = getStockVariant(sku.inventory);
	const displayTitle = getSkuDisplayTitle(sku);
	const spokenTitle = getSkuDisplayTitleSpoken(sku);
	const colorHexes = getColorHexes(sku.colors);

	const { sections } = useSkuActions({
		skuId: sku.id,
		skuName: sku.sku,
		productSlug,
		isDefault: sku.isDefault,
		isActive: sku.isActive,
		inventory: sku.inventory,
		priceInclTax: sku.priceInclTax,
		compareAtPrice: sku.compareAtPrice,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/produits/${productSlug}/variantes/${sku.id}`}
			ariaLabel={`Variante : ${spokenTitle}`}
			sections={sections}
			menuTitle="Actions variante"
			menuDescription={displayTitle}
			className="text-left"
			viewTransitionName={`sku-card-${sku.id}`}
		>
			<Item
				variant="outline"
				size="sm"
				className={"w-full gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte variante"
			>
				{primaryImage && thumbSrc ? (
					<Image
						src={thumbSrc}
						alt=""
						width={48}
						height={48}
						sizes="(max-width: 640px) 48px, (max-width: 1024px) 64px, 80px"
						className="size-12 shrink-0 rounded-md border object-cover"
						{...(preload ? { preload: true } : {})}
						{...(primaryImage.blurDataUrl
							? { placeholder: "blur", blurDataURL: primaryImage.blurDataUrl }
							: {})}
					/>
				) : (
					<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border">
						<PackageIcon className="text-muted-foreground size-5" aria-hidden="true" />
					</div>
				)}
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						{colorHexes.length > 0 ? (
							<span
								className="border-border inline-block size-3 shrink-0 rounded-full border"
								style={buildSwatchStyle(colorHexes)}
								aria-hidden="true"
							/>
						) : null}
						<span className="truncate font-semibold">{displayTitle}</span>
						{sku.isDefault ? <Badge variant="secondary">Par défaut</Badge> : null}
						{!sku.isActive ? <Badge variant="outline">Inactif</Badge> : null}
						<Badge
							variant={stockVariant}
							aria-label={getStockAriaLabel(sku.inventory)}
							style={{ viewTransitionName: `sku-stock-${sku.id}` }}
						>
							{sku.inventory}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="font-medium">{formatEuro(sku.priceInclTax)}</span>
						<span aria-hidden="true">·</span>
						<span className="text-muted-foreground font-mono text-xs tabular-nums">{sku.sku}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</LongPressMenuLink>
	);
}
