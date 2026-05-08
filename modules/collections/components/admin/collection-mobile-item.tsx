"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";

import { useCollectionActions } from "../../hooks/use-collection-actions";

interface CollectionMobileItemProps {
	collection: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		status: CollectionStatus;
		_count: { products: number };
	};
}

const STATUS_CONFIG: Record<
	CollectionStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[CollectionStatus.PUBLIC]: { label: "Public", variant: "default" },
	[CollectionStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[CollectionStatus.ARCHIVED]: { label: "Archive", variant: "outline" },
};

export function CollectionMobileItem({ collection }: CollectionMobileItemProps) {
	const productsCount = collection._count.products || 0;
	const statusConfig = STATUS_CONFIG[collection.status];

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
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte collection"
			>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{collection.name}</span>
						<Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
					</ItemTitle>
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
