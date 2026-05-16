"use client";

import { Loader2, Package } from "lucide-react";
import Image from "next/image";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { cn } from "@/shared/utils/cn";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";

import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { useSkuActions } from "@/modules/skus/hooks/use-sku-actions";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";
import {
	getSkuDisplayTitle,
	getSkuDisplayTitleSpoken,
} from "@/modules/skus/utils/sku-display-title";
import { getColorHexes } from "@/modules/skus/utils/sku-colors-label";
import { buildSwatchStyle } from "@/modules/colors/utils/swatch-style";

type Sku = GetProductSkusReturn["productSkus"][number];

interface SkuMobileItemProps {
	sku: Sku;
	productSlug: string;
}

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) => PRICE_FORMATTER.format(priceInCents / 100);

export function SkuMobileItem({ sku, productSlug }: SkuMobileItemProps) {
	const primaryImage = sku.images.find((img) => img.isPrimary) ?? sku.images[0] ?? null;
	const stockVariant = getStockVariant(sku.inventory);
	const displayTitle = getSkuDisplayTitle(sku);
	const spokenTitle = getSkuDisplayTitleSpoken(sku);
	const colorHexes = getColorHexes(sku.colors);

	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(sku.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	const pendingLabel = isPendingItem ? ADMIN_PENDING_LABELS[pendingKind ?? "status"] : null;

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
		<MobileSelectableCard
			id={sku.id}
			itemLabel={`Variante ${displayTitle}`}
			longPressProps={{
				href: `/admin/catalogue/produits/${productSlug}/variantes/${sku.id}`,
				ariaLabel: `Variante : ${spokenTitle}`,
				sections,
				menuTitle: "Actions variante",
				menuDescription: displayTitle,
				className: "text-left",
				viewTransitionName: `sku-card-${sku.id}`,
			}}
		>
			<Item
				variant="outline"
				size="sm"
				className={cn("w-full gap-3 motion-safe:transition-opacity", isPendingItem && "opacity-60")}
				aria-roledescription="carte variante"
				aria-busy={isPendingItem || undefined}
			>
				{primaryImage ? (
					primaryImage.mediaType === "VIDEO" ? (
						<video
							className="size-12 shrink-0 rounded-md border object-cover"
							muted
							loop
							playsInline
							preload="none"
							poster={primaryImage.thumbnailUrl ?? undefined}
							aria-label={primaryImage.altText ?? `Vidéo variante ${sku.sku}`}
						>
							<source src={primaryImage.url} type={getVideoMimeType(primaryImage.url)} />
						</video>
					) : (
						<Image
							src={primaryImage.url}
							alt=""
							width={48}
							height={48}
							sizes="(max-width: 640px) 48px, (max-width: 1024px) 64px, 80px"
							className="size-12 shrink-0 rounded-md border object-cover"
							{...(primaryImage.blurDataUrl
								? { placeholder: "blur", blurDataURL: primaryImage.blurDataUrl }
								: {})}
						/>
					)
				) : (
					<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border">
						<Package className="text-muted-foreground size-5" aria-hidden="true" />
					</div>
				)}
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0 flex-wrap items-center">
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
						{isPendingItem ? (
							<Badge
								variant="secondary"
								aria-live="polite"
								style={{ viewTransitionName: `sku-stock-${sku.id}` }}
							>
								<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
								{pendingLabel}
							</Badge>
						) : (
							<Badge
								variant={stockVariant}
								aria-label={getStockAriaLabel(sku.inventory)}
								style={{ viewTransitionName: `sku-stock-${sku.id}` }}
							>
								{sku.inventory}
							</Badge>
						)}
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="font-medium">{formatPrice(sku.priceInclTax)}</span>
						<span aria-hidden="true">·</span>
						<span className="text-muted-foreground font-mono text-xs tabular-nums">{sku.sku}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</MobileSelectableCard>
	);
}
