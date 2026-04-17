"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { COLLECTION_ITEM_DRAWER_ID, type CollectionItemDrawerData } from "./collection-item-drawer";

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

	return (
		<button
			type="button"
			onClick={handleOpen}
			className="focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none focus-visible:ring-[3px]"
			aria-label={`Ouvrir la fiche de la collection ${collection.name}`}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte collection"
			>
				<ItemContent className="min-w-0">
					<ItemTitle>
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
	);
}
