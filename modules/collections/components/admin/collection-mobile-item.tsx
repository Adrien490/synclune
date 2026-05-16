"use client";

import { FolderOpen, Loader2 } from "lucide-react";
import Image from "next/image";

import { CollectionStatus } from "@/app/generated/prisma/enums";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { cn } from "@/shared/utils/cn";

import type { Collection } from "../../types/collection.types";
import { useCollectionActions } from "../../hooks/use-collection-actions";

interface CollectionMobileItemProps {
	collection: Pick<
		Collection,
		"id" | "name" | "slug" | "description" | "status" | "products" | "_count"
	>;
}

const STATUS_CONFIG: Record<
	CollectionStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[CollectionStatus.PUBLIC]: { label: "● Public", variant: "default" },
	[CollectionStatus.DRAFT]: { label: "○ Brouillon", variant: "secondary" },
	[CollectionStatus.ARCHIVED]: { label: "▣ Archive", variant: "outline" },
};

function getCoverImage(products: CollectionMobileItemProps["collection"]["products"]) {
	for (const join of products) {
		const sku = join.product.skus[0];
		const image = sku?.images[0];
		if (image?.url) return image;
	}
	return null;
}

export function CollectionMobileItem({ collection }: CollectionMobileItemProps) {
	const productsCount = collection._count.products || 0;
	const statusConfig = STATUS_CONFIG[collection.status];
	const cover = getCoverImage(collection.products);
	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(collection.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	const pendingLabel = isPendingItem ? ADMIN_PENDING_LABELS[pendingKind ?? "status"] : null;

	const { sections } = useCollectionActions({
		collectionId: collection.id,
		collectionName: collection.name,
		collectionSlug: collection.slug,
		collectionDescription: collection.description,
		collectionStatus: collection.status,
		productsCount,
	});

	return (
		<MobileSelectableCard
			id={collection.id}
			itemLabel={`Collection ${collection.name}`}
			longPressProps={{
				href: `/admin/catalogue/collections/${collection.slug}`,
				ariaLabel: `Collection ${collection.name}`,
				sections,
				menuTitle: "Actions collection",
				menuDescription: collection.name,
				className: "text-left",
				viewTransitionName: `collection-card-${collection.id}`,
			}}
		>
			<Item
				variant="outline"
				size="sm"
				className={cn(
					"w-full gap-3 motion-safe:transition-opacity",
					isPendingItem && "opacity-60 dark:opacity-50",
				)}
				aria-roledescription="carte collection"
				aria-busy={isPendingItem || undefined}
			>
				{cover ? (
					<Image
						src={cover.url}
						alt=""
						width={48}
						height={48}
						sizes="(max-width: 640px) 48px, (max-width: 1024px) 64px, 80px"
						className="size-12 shrink-0 rounded-md border object-cover"
						style={{ viewTransitionName: `collection-image-${collection.id}` }}
						{...(cover.blurDataUrl ? { placeholder: "blur", blurDataURL: cover.blurDataUrl } : {})}
					/>
				) : (
					<div
						className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border"
						style={{ viewTransitionName: `collection-image-${collection.id}` }}
					>
						<FolderOpen className="text-muted-foreground size-5" aria-hidden="true" />
					</div>
				)}
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{collection.name}</span>
						{isPendingItem ? (
							<Badge
								variant="secondary"
								aria-live="polite"
								style={{ viewTransitionName: `collection-status-${collection.id}` }}
							>
								<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
								{pendingLabel}
							</Badge>
						) : (
							<Badge
								variant={statusConfig.variant}
								style={{ viewTransitionName: `collection-status-${collection.id}` }}
							>
								{statusConfig.label}
							</Badge>
						)}
					</ItemTitle>
					{collection.description ? (
						<ItemDescription className="line-clamp-1">{collection.description}</ItemDescription>
					) : null}
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span style={{ viewTransitionName: `collection-product-count-${collection.id}` }}>
							{productsCount} produit{productsCount !== 1 ? "s" : ""}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</MobileSelectableCard>
	);
}
