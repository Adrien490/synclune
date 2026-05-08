"use client";

import { FolderOpen } from "lucide-react";
import Image from "next/image";

import { CollectionStatus } from "@/app/generated/prisma/enums";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";

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

	const { sections } = useCollectionActions({
		collectionId: collection.id,
		collectionName: collection.name,
		collectionSlug: collection.slug,
		collectionDescription: collection.description,
		collectionStatus: collection.status,
		productsCount,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/collections/${collection.slug}/modifier`}
			ariaLabel={`Collection ${collection.name}`}
			sections={sections}
			menuTitle="Actions collection"
			menuDescription={collection.name}
			className="text-left"
			viewTransitionName={`collection-card-${collection.id}`}
		>
			<Item variant="outline" size="sm" className="w-full gap-3">
				{cover ? (
					<Image
						src={cover.url}
						alt=""
						width={48}
						height={48}
						sizes="48px"
						className="size-12 shrink-0 rounded-md border object-cover"
						{...(cover.blurDataUrl ? { placeholder: "blur", blurDataURL: cover.blurDataUrl } : {})}
					/>
				) : (
					<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border">
						<FolderOpen className="text-muted-foreground size-5" aria-hidden="true" />
					</div>
				)}
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{collection.name}</span>
						<Badge
							variant={statusConfig.variant}
							style={{ viewTransitionName: `collection-status-${collection.id}` }}
						>
							{statusConfig.label}
						</Badge>
					</ItemTitle>
					{collection.description ? (
						<ItemDescription className="line-clamp-1">{collection.description}</ItemDescription>
					) : null}
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>
							{productsCount} produit{productsCount !== 1 ? "s" : ""}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</LongPressMenuLink>
	);
}
