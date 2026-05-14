"use client";

import { Loader2, Package } from "lucide-react";
import Image from "next/image";

import { ProductStatus } from "@/app/generated/prisma/enums";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import {
	useAdminListPendingContextOptional,
	type AdminListPendingKind,
} from "@/shared/contexts/admin-list-pending-context";
import { cn } from "@/shared/utils/cn";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";

import { useProductActions } from "../../hooks/use-product-actions";

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) => PRICE_FORMATTER.format(priceInCents / 100);

const STATUS_CONFIG: Record<
	ProductStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[ProductStatus.PUBLIC]: { label: "● Public", variant: "default" },
	[ProductStatus.DRAFT]: { label: "○ Brouillon", variant: "secondary" },
	[ProductStatus.ARCHIVED]: { label: "▣ Archivé", variant: "outline" },
};

const PENDING_LABEL: Record<AdminListPendingKind, string> = {
	archive: "Archivage…",
	restore: "Restauration…",
	delete: "Suppression…",
	status: "Mise à jour…",
	"attach-collection": "Ajout à la collection…",
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
	const statusConfig = STATUS_CONFIG[product.status];
	const priceDisplay = getPriceDisplay(product.skus);
	const stock = getTotalStock(product.skus);
	const primaryImage = product.skus.flatMap((sku) => sku.images).find((img) => img.isPrimary);

	const { sections } = useProductActions({
		productId: product.id,
		productSlug: product.slug,
		productTitle: product.title,
		productStatus: product.status,
	});

	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(product.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	const pendingLabel = isPendingItem ? PENDING_LABEL[pendingKind ?? "status"] : null;

	const stockVariant = getStockVariant(stock);
	const stockAriaLabel = getStockAriaLabel(stock);

	return (
		<MobileSelectableCard
			id={product.id}
			itemLabel={`Produit ${product.title}`}
			longPressProps={{
				href: `/admin/catalogue/produits/${product.slug}`,
				ariaLabel: `Produit ${product.title}`,
				sections,
				menuTitle: "Actions",
				menuDescription: product.title,
				className: "text-left",
				viewTransitionName: `product-card-${product.id}`,
			}}
		>
			<Item
				variant="outline"
				size="sm"
				className={cn(
					"w-full gap-3 motion-safe:transition-[opacity,background-color] motion-safe:duration-200",
					isPendingItem && "dark:bg-muted/20 opacity-60 dark:opacity-50",
				)}
				aria-busy={isPendingItem || undefined}
			>
				{primaryImage ? (
					<Image
						src={primaryImage.thumbnailUrl ?? primaryImage.url}
						alt=""
						width={48}
						height={48}
						sizes="(max-width: 640px) 48px, (max-width: 1024px) 64px, 80px"
						className="size-12 shrink-0 rounded-md border object-cover"
						style={{ viewTransitionName: `product-image-${product.id}` }}
						{...(primaryImage.blurDataUrl
							? { placeholder: "blur", blurDataURL: primaryImage.blurDataUrl }
							: {})}
					/>
				) : (
					<div
						className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border"
						style={{ viewTransitionName: `product-image-${product.id}` }}
					>
						<Package className="text-muted-foreground size-5" aria-hidden="true" />
					</div>
				)}
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{product.title}</span>
						{isPendingItem ? (
							<Badge
								variant="secondary"
								className="gap-1"
								aria-live="polite"
								style={{ viewTransitionName: `product-status-${product.id}` }}
							>
								<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
								{pendingLabel}
							</Badge>
						) : (
							<Badge
								variant={statusConfig.variant}
								style={{ viewTransitionName: `product-status-${product.id}` }}
							>
								{statusConfig.label}
							</Badge>
						)}
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
							{product.skus.length} variante{product.skus.length > 1 ? "s" : ""}
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
		</MobileSelectableCard>
	);
}
