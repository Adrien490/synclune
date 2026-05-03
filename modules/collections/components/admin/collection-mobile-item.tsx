"use client";

import { useState } from "react";

import { CollectionStatus } from "@/app/generated/prisma/enums";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useLongPress } from "@/shared/hooks";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";

import { COLLECTION_ITEM_DRAWER_ID, type CollectionItemDrawerData } from "./collection-item-drawer";
import { CollectionRowActions } from "./collection-row-actions";

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
	const { open } = useDialog<CollectionItemDrawerData>(COLLECTION_ITEM_DRAWER_ID);
	const haptic = useHaptic();
	const productsCount = collection._count.products || 0;
	const statusConfig = STATUS_CONFIG[collection.status];

	const [menuOpen, setMenuOpen] = useState(false);

	const handleOpen = () => {
		haptic("selection");
		open({
			collection: {
				id: collection.id,
				name: collection.name,
				slug: collection.slug,
				description: collection.description,
				status: collection.status,
				productsCount,
			},
		});
	};

	const { bind } = useLongPress(() => setMenuOpen(true), { onClick: handleOpen });

	return (
		<>
			<button
				type="button"
				aria-label={`Collection ${collection.name}`}
				{...bind}
				className={cn(
					"focus-visible:ring-primary w-full rounded-lg text-left",
					"focus-visible:ring-2 focus-visible:outline-none",
				)}
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
			</button>
			<CollectionRowActions
				collectionId={collection.id}
				collectionName={collection.name}
				collectionSlug={collection.slug}
				collectionDescription={collection.description}
				collectionStatus={collection.status}
				productsCount={productsCount}
				open={menuOpen}
				onOpenChange={setMenuOpen}
				hideTrigger
			/>
		</>
	);
}
