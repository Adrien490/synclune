"use client";

import { useState } from "react";

import { MaterialsRowActions } from "@/modules/materials/components/materials-row-actions";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useLongPress } from "@/shared/hooks";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";

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
	const haptic = useHaptic();
	const skuCount = material._count.skus || 0;
	const statusLabel = material.isActive ? "Actif" : "Inactif";

	const [menuOpen, setMenuOpen] = useState(false);

	const handleOpen = () => {
		haptic("selection");
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

	const { bind } = useLongPress(() => setMenuOpen(true), { onClick: handleOpen });

	return (
		<>
			<button
				type="button"
				aria-label={`Matériau ${material.name}`}
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
					aria-roledescription="carte materiau"
				>
					<ItemContent className="min-w-0">
						<ItemTitle className="w-full min-w-0">
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
			</button>
			<MaterialsRowActions
				materialId={material.id}
				materialName={material.name}
				materialSlug={material.slug}
				materialDescription={material.description}
				materialIsActive={material.isActive}
				open={menuOpen}
				onOpenChange={setMenuOpen}
				hideTrigger
			/>
		</>
	);
}
