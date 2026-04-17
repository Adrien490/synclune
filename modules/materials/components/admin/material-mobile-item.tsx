"use client";

import { SelectableMobileCard } from "@/shared/components/selectable-mobile-card";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { MATERIAL_ITEM_DRAWER_ID, type MaterialItemDrawerData } from "./material-item-drawer";

interface MaterialMobileItemProps {
	material: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		isActive: boolean;
		_count: { skus: number };
	};
}

export function MaterialMobileItem({ material }: MaterialMobileItemProps) {
	const { open } = useDialog<MaterialItemDrawerData>(MATERIAL_ITEM_DRAWER_ID);
	const skuCount = material._count.skus || 0;
	const statusLabel = material.isActive ? "Actif" : "Inactif";

	const handleOpen = () => {
		open({
			material: {
				id: material.id,
				name: material.name,
				slug: material.slug,
				description: material.description,
				isActive: material.isActive,
				skuCount,
			},
		});
	};

	return (
		<SelectableMobileCard
			itemId={material.id}
			ariaLabel={`Matériau ${material.name}`}
			onOpen={handleOpen}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte materiau"
			>
				<ItemContent className="min-w-0">
					<ItemTitle>
						<span className="truncate font-semibold">{material.name}</span>
						<Badge variant={material.isActive ? "default" : "secondary"}>{statusLabel}</Badge>
					</ItemTitle>
					{material.description ? (
						<ItemDescription className="line-clamp-1">{material.description}</ItemDescription>
					) : null}
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>
							{skuCount} variante{skuCount !== 1 ? "s" : ""}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</SelectableMobileCard>
	);
}
