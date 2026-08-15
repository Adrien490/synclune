"use client";

import { PackageIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { formatEuro } from "@/shared/utils/format-euro";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";

import { useVariantActions } from "@/modules/variants/hooks/use-variant-actions";
import type { GetProductVariantsReturn } from "@/modules/variants/types/variants.types";
import {
	getVariantDisplayTitle,
	getVariantDisplayTitleSpoken,
} from "@/modules/variants/utils/variant-display-title";
import { getColorHexes } from "@/modules/variants/utils/variant-colors-label";
import { buildSwatchStyle } from "@/modules/colors/utils/swatch-style";
import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";

type Variant = GetProductVariantsReturn["productVariants"][number];

interface VariantMobileItemProps {
	variant: Variant;
	productSlug: string;
	/** Premier item ATF : déclenche preload SSR (LCP candidate). */
	preload?: boolean;
	/**
	 * Vrai si le VARIANT est le représentant du produit — rang 0 de
	 * (position asc, id asc), calculé au niveau liste via `representativeVariantId`
	 * (remplace la colonne `isDefault`, audit schéma V5, lot A2).
	 */
	isRepresentative?: boolean;
}

export function VariantMobileItem({
	variant,
	productSlug,
	preload,
	isRepresentative = false,
}: VariantMobileItemProps) {
	// Schéma lean : le média vit sur le PRODUIT — vignette = première IMAGE du
	// produit (filtre + ordre canonique portés par le select).
	const primaryImage = variant.product.media[0] ?? null;
	// Une vidéo sans poster n'est pas décodable par l'optimiseur -> icône de secours.
	// Remplace l'ancien `unoptimized` qui servait une URL .mp4 à `next/image`.
	const thumbSrc = primaryImage ? resolveMediaThumbSrc(primaryImage) : null;
	const stockVariant = getStockVariant(variant.stock);
	const displayTitle = getVariantDisplayTitle({ ...variant, isRepresentative });
	const spokenTitle = getVariantDisplayTitleSpoken({ ...variant, isRepresentative });
	const colorHexes = getColorHexes(variant.color);

	const { sections } = useVariantActions({
		variantId: variant.id,
		variantName: displayTitle,
		productSlug,
		isRepresentative,
		active: variant.active,
		stock: variant.stock,
		priceCents: variant.priceCents ?? variant.product.priceCents,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/produits/${productSlug}/variantes/${variant.id}`}
			ariaLabel={`Variante : ${spokenTitle}`}
			sections={sections}
			menuTitle="Actions variante"
			menuDescription={displayTitle}
			className="text-left"
			viewTransitionName={`variant-card-${variant.id}`}
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
						quality={IMAGE_QUALITY.THUMBNAIL}
						className="size-12 shrink-0 rounded-md border object-cover"
						{...(preload ? { preload: true } : {})}
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
						{isRepresentative ? <Badge variant="secondary">Par défaut</Badge> : null}
						{!variant.active ? <Badge variant="outline">Inactif</Badge> : null}
						<Badge
							variant={stockVariant}
							aria-label={getStockAriaLabel(variant.stock)}
							style={{ viewTransitionName: `variant-stock-${variant.id}` }}
						>
							{variant.stock}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="font-medium">
							{formatEuro(variant.priceCents ?? variant.product.priceCents)}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</LongPressMenuLink>
	);
}
