"use client";

import { FolderOpenIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";

import type { Collection } from "../../types/collection.types";
import { useCollectionActions } from "../../hooks/use-collection-actions";

interface CollectionMobileItemProps {
	collection: Pick<
		Collection,
		"id" | "name" | "slug" | "description" | "active" | "products" | "_count"
	>;
	/** Premier item ATF : déclenche preload SSR (LCP candidate). */
	preload?: boolean;
}

function getCoverImage(products: CollectionMobileItemProps["collection"]["products"]) {
	for (const product of products) {
		const image = product.media[0];
		if (image?.url) return image;
	}
	return null;
}

export function CollectionMobileItem({ collection, preload }: CollectionMobileItemProps) {
	const productsCount = collection._count.products || 0;
	const cover = getCoverImage(collection.products);

	const { sections } = useCollectionActions({
		collectionId: collection.id,
		collectionName: collection.name,
		collectionSlug: collection.slug,
		collectionDescription: collection.description,
		collectionActive: collection.active,
		productsCount,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/collections/${collection.slug}`}
			ariaLabel={`Collection ${collection.name}`}
			sections={sections}
			menuTitle="Actions collection"
			menuDescription={collection.name}
			className="text-left"
			viewTransitionName={`collection-card-${collection.id}`}
		>
			<Item
				variant="outline"
				size="sm"
				className={"w-full gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte collection"
			>
				{cover ? (
					<Image
						src={cover.url}
						alt=""
						width={48}
						height={48}
						sizes="(max-width: 640px) 48px, (max-width: 1024px) 64px, 80px"
						quality={IMAGE_QUALITY.THUMBNAIL}
						className="size-12 shrink-0 rounded-md border object-cover"
						style={{ viewTransitionName: `collection-image-${collection.id}` }}
						{...(preload ? { preload: true } : {})}
					/>
				) : (
					<div
						className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border"
						style={{ viewTransitionName: `collection-image-${collection.id}` }}
					>
						<FolderOpenIcon className="text-muted-foreground size-5" aria-hidden="true" />
					</div>
				)}
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{collection.name}</span>
						<Badge
							variant={collection.active ? "default" : "secondary"}
							style={{ viewTransitionName: `collection-status-${collection.id}` }}
						>
							{collection.active ? "● Publiée" : "○ Brouillon"}
						</Badge>
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
		</LongPressMenuLink>
	);
}
