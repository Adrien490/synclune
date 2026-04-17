"use client";

import { Package } from "lucide-react";
import Image from "next/image";

import { ProductStatus } from "@/app/generated/prisma/enums";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { PRODUCT_ITEM_DRAWER_ID, type ProductItemDrawerData } from "./product-item-drawer";

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) => PRICE_FORMATTER.format(priceInCents / 100);

const STATUS_CONFIG: Record<
	ProductStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[ProductStatus.PUBLIC]: { label: "Public", variant: "default" },
	[ProductStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[ProductStatus.ARCHIVED]: { label: "Archivé", variant: "outline" },
};

interface Sku {
	priceInclTax: number;
	inventory: number;
	images: Array<{
		url: string;
		thumbnailUrl?: string | null;
		blurDataUrl?: string | null;
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
}

const getTotalStock = (skus: Sku[]) => skus.reduce((sum, sku) => sum + (sku.inventory || 0), 0);

const getPriceDisplay = (skus: Sku[]) => {
	if (skus.length === 0) return "—";
	const prices = skus.map((s) => s.priceInclTax);
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
};

export function ProductMobileItem({ product }: ProductMobileItemProps) {
	const { open } = useDialog<ProductItemDrawerData>(PRODUCT_ITEM_DRAWER_ID);
	const statusConfig = STATUS_CONFIG[product.status];
	const priceDisplay = getPriceDisplay(product.skus);
	const stock = getTotalStock(product.skus);
	const primaryImage = product.skus.flatMap((sku) => sku.images).find((img) => img.isPrimary);

	const handleOpen = () => {
		open({
			product: {
				id: product.id,
				slug: product.slug,
				title: product.title,
				status: product.status,
				priceDisplay,
				stock,
				variantsCount: product.skus.length,
				typeLabel: product.type?.label ?? null,
			},
		});
	};

	return (
		<button
			type="button"
			onClick={handleOpen}
			className="focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none focus-visible:ring-[3px]"
			aria-label={`Ouvrir la fiche du produit ${product.title}`}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte produit"
			>
				{primaryImage ? (
					<Image
						src={primaryImage.thumbnailUrl ?? primaryImage.url}
						alt=""
						width={48}
						height={48}
						className="size-12 shrink-0 rounded-md border object-cover"
						{...(primaryImage.blurDataUrl
							? { placeholder: "blur", blurDataURL: primaryImage.blurDataUrl }
							: {})}
					/>
				) : (
					<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border">
						<Package className="text-muted-foreground size-5" aria-hidden="true" />
					</div>
				)}
				<ItemContent className="min-w-0">
					<ItemTitle>
						<span className="truncate font-semibold">{product.title}</span>
						<Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="font-medium">{priceDisplay}</span>
						<span aria-hidden="true">·</span>
						<span>{stock} en stock</span>
						<span aria-hidden="true">·</span>
						<span>
							{product.skus.length} variante{product.skus.length > 1 ? "s" : ""}
						</span>
						{product.type ? (
							<>
								<span aria-hidden="true">·</span>
								<span>{product.type.label}</span>
							</>
						) : null}
					</ItemDescription>
				</ItemContent>
			</Item>
		</button>
	);
}
