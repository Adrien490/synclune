"use client";

import { PackageIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";

import type { MediaType } from "@/app/generated/prisma/client";
import { ProductStatus } from "@/app/generated/prisma/enums";

import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import {
	PRODUCT_STATUS_LABELS,
	PRODUCT_STATUS_VARIANTS,
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
const STATUS_CONFIG: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
	[ProductStatus.PUBLIC]: {
		label: `● ${PRODUCT_STATUS_LABELS.PUBLIC}`,
		variant: PRODUCT_STATUS_VARIANTS.PUBLIC,
	},
	[ProductStatus.DRAFT]: {
		label: `○ ${PRODUCT_STATUS_LABELS.DRAFT}`,
		variant: PRODUCT_STATUS_VARIANTS.DRAFT,
	},
	[ProductStatus.ARCHIVED]: {
		label: `▣ ${PRODUCT_STATUS_LABELS.ARCHIVED}`,
		variant: PRODUCT_STATUS_VARIANTS.ARCHIVED,
	},
};

interface Sku {
	priceInclTax: number;
	inventory: number;
	images: Array<{
		url: string;
		thumbnailUrl?: string | null;
		blurDataUrl?: string | null;
		mediaType: MediaType;
		isPrimary: boolean;
	}>;
}

interface ProductMobileItemProps {
	product: {
		id: string;
		slug: string;
		title: string;
		status: ProductStatus;
		skus: Sku[];
		type: { label: string } | null;
	};
	/** Premier item ATF : déclenche preload SSR (LCP candidate). */
	preload?: boolean;
}

const getTotalStock = (skus: Sku[]) => skus.reduce((sum, sku) => sum + (sku.inventory || 0), 0);

const getPriceDisplay = (skus: Sku[]) => {
	if (skus.length === 0) return "—";
	const prices = skus.map((s) => s.priceInclTax);
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	return min === max ? formatEuro(min) : `${formatEuro(min)} – ${formatEuro(max)}`;
};

export function ProductMobileItem({ product, preload }: ProductMobileItemProps) {
	const statusConfig = STATUS_CONFIG[product.status];
	const priceDisplay = getPriceDisplay(product.skus);
	const stock = getTotalStock(product.skus);
	const primaryImage = product.skus.flatMap((sku) => sku.images).find((img) => img.isPrimary);
	// Une vidéo sans poster n'est pas décodable par l'optimiseur -> icône de secours
	const thumbSrc = primaryImage ? resolveMediaThumbSrc(primaryImage) : null;

	const { sections } = useProductActions({
		productId: product.id,
		productSlug: product.slug,
		productTitle: product.title,
		productStatus: product.status,
	});

	const stockVariant = getStockVariant(stock);
	const stockAriaLabel = getStockAriaLabel(stock);

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/produits/${product.slug}`}
			ariaLabel={`Produit ${product.title}`}
			sections={sections}
			menuTitle="Actions"
			menuDescription={product.title}
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
						{...(primaryImage.blurDataUrl
							? { placeholder: "blur", blurDataURL: primaryImage.blurDataUrl }
							: {})}
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
						<span className="truncate font-semibold">{product.title}</span>
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
							{product.skus.length <= 1 ? "Variante unique" : `${product.skus.length} variantes`}
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
