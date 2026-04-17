"use client";

import { Package } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";

import { SKU_ITEM_DRAWER_ID, type SkuItemDrawerData } from "./sku-item-drawer";

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

const getStockVariant = (inventory: number): "destructive" | "warning" | "success" => {
	if (inventory === 0) return "destructive";
	if (inventory <= STOCK_THRESHOLDS.LOW) return "warning";
	return "success";
};

const getStockAriaLabel = (inventory: number) => {
	if (inventory === 0) return "Stock épuisé";
	if (inventory <= STOCK_THRESHOLDS.LOW) return `Stock faible : ${inventory} disponible(s)`;
	return `${inventory} en stock`;
};

export function SkuMobileItem({ sku, productSlug }: SkuMobileItemProps) {
	const { open } = useDialog<SkuItemDrawerData>(SKU_ITEM_DRAWER_ID);
	const haptic = useHaptic();
	const primaryImage = sku.images.find((img) => img.isPrimary) ?? sku.images[0] ?? null;
	const stockVariant = getStockVariant(sku.inventory);

	const handleOpen = () => {
		haptic("selection");
		open({
			sku: {
				id: sku.id,
				skuCode: sku.sku,
				productSlug,
				isDefault: sku.isDefault,
				isActive: sku.isActive,
				inventory: sku.inventory,
				priceInclTax: sku.priceInclTax,
				compareAtPrice: sku.compareAtPrice,
				colorName: sku.color?.name ?? null,
				materialName: sku.material?.name ?? null,
				size: sku.size,
			},
		});
	};

	return (
		<button
			type="button"
			onClick={handleOpen}
			className="focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none focus-visible:ring-[3px]"
			aria-label={`Ouvrir la fiche de la variante ${sku.sku}`}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte variante"
			>
				{primaryImage ? (
					primaryImage.mediaType === "VIDEO" ? (
						<video
							className="size-12 shrink-0 rounded-md border object-cover"
							muted
							loop
							playsInline
							preload="none"
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
							sizes="48px"
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
					<ItemTitle>
						<span className="truncate font-semibold">{sku.sku}</span>
						{sku.isDefault ? <Badge variant="secondary">Par défaut</Badge> : null}
						{!sku.isActive ? <Badge variant="outline">Inactif</Badge> : null}
						<Badge variant={stockVariant} aria-label={getStockAriaLabel(sku.inventory)}>
							{sku.inventory}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="font-medium">{formatPrice(sku.priceInclTax)}</span>
						{sku.color ? (
							<>
								<span aria-hidden="true">·</span>
								<span className="inline-flex items-center gap-1">
									<span
										className="border-border size-3 rounded-full border"
										style={{ backgroundColor: sku.color.hex }}
										aria-hidden="true"
									/>
									{sku.color.name}
								</span>
							</>
						) : null}
						{sku.material ? (
							<>
								<span aria-hidden="true">·</span>
								<span>{sku.material.name}</span>
							</>
						) : null}
						{sku.size ? (
							<>
								<span aria-hidden="true">·</span>
								<span>{sku.size}</span>
							</>
						) : null}
					</ItemDescription>
				</ItemContent>
			</Item>
		</button>
	);
}
