"use client";

import { PackageIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";

import type { MediaType } from "@/app/generated/prisma/client";

import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import { pickPrimaryImage } from "@/modules/products/services/product-display.service";
import {
	productStatusLabel,
	productStatusVariant,
} from "@/modules/products/constants/product-status-display";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import type { BadgeVariant } from "@/shared/types/badge.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";

import { useProductActions } from "../../hooks/use-product-actions";

// Glyphes = affordance locale (distinction hors couleur en liste dense) ;
// libellés et variants dérivés de la SSOT product-status-display.
function statusConfigOf(active: boolean): { label: string; variant: BadgeVariant } {
	return {
		label: `${active ? "●" : "○"} ${productStatusLabel(active)}`,
		variant: productStatusVariant(active),
	};
}

interface Variant {
	/** Override — null = prix du produit. */
	priceCents: number | null;
	stock: number;
}

interface ProductMobileItemProps {
	product: {
		id: string;
		slug: string;
		name: string;
		active: boolean;
		priceCents: number;
		variants: Variant[];
		media: Array<{ url: string; alt: string | null; type: MediaType }>;
		type: { label: string } | null;
	};
	/** Premier item ATF : déclenche preload SSR (LCP candidate). */
	preload?: boolean;
}

const getTotalStock = (variants: Variant[]) =>
	variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);

const getPriceDisplay = (variants: Variant[], basePriceCents: number) => {
	if (variants.length === 0) return formatEuro(basePriceCents);
	const prices = variants.map((v) => v.priceCents ?? basePriceCents);
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	return min === max ? formatEuro(min) : `${formatEuro(min)} – ${formatEuro(max)}`;
};

export function ProductMobileItem({ product, preload }: ProductMobileItemProps) {
	const statusConfig = statusConfigOf(product.active);
	const priceDisplay = getPriceDisplay(product.variants, product.priceCents);
	const stock = getTotalStock(product.variants);
	// Première IMAGE de l'ordre canonique (le select trie les médias par position)
	// — SSOT pickPrimaryImage : une vidéo au rang 0 ne doit pas devenir vignette
	const primaryImage = pickPrimaryImage(product.media);
	const thumbSrc = primaryImage ? resolveMediaThumbSrc(primaryImage) : null;

	const { sections } = useProductActions({
		productId: product.id,
		productSlug: product.slug,
		productTitle: product.name,
		productActive: product.active,
	});

	const stockVariant = getStockVariant(stock);
	const stockAriaLabel = getStockAriaLabel(stock);

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/produits/${product.slug}`}
			ariaLabel={`Produit ${product.name}`}
			sections={sections}
			menuTitle="Actions"
			menuDescription={product.name}
			className="text-left"
			viewTransitionName={`product-card-${product.id}`}
		>
			<Item
				variant="outline"
				size="sm"
				className={"w-full gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte produit"
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
						style={{ viewTransitionName: `product-image-${product.id}` }}
						{...(preload ? { preload: true } : {})}
					/>
				) : (
					<div
						className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border"
						style={{ viewTransitionName: `product-image-${product.id}` }}
					>
						<PackageIcon className="text-muted-foreground size-5" aria-hidden="true" />
					</div>
				)}
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{product.name}</span>
						<Badge
							variant={statusConfig.variant}
							style={{ viewTransitionName: `product-status-${product.id}` }}
						>
							{statusConfig.label}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="font-medium">{priceDisplay}</span>
						<span className="sr-only">, </span>
						<span aria-hidden="true">·</span>
						<Badge
							variant={stockVariant}
							aria-label={stockAriaLabel}
							style={{ viewTransitionName: `product-stock-${product.id}` }}
						>
							{stock}
						</Badge>
						<span className="sr-only">, </span>
						<span aria-hidden="true">·</span>
						<span>
							{product.variants.length <= 1
								? "Variante unique"
								: `${product.variants.length} variantes`}
						</span>
						{product.type ? (
							<>
								<span className="sr-only">, </span>
								<span aria-hidden="true">·</span>
								<span>{product.type.label}</span>
							</>
						) : null}
					</ItemDescription>
				</ItemContent>
			</Item>
		</LongPressMenuLink>
	);
}
