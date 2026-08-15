"use client";

import { SwatchesIcon } from "@phosphor-icons/react/ssr";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";

import { useMaterialActions } from "../../hooks/use-material-actions";

interface MaterialMobileItemProps {
	material: {
		id: string;
		name: string;
		_count: { variants: number };
	};
}

export function MaterialMobileItem({ material }: MaterialMobileItemProps) {
	const variantCount = material._count.variants;

	const { sections } = useMaterialActions({
		materialId: material.id,
		materialName: material.name,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/materiaux/${material.id}`}
			ariaLabel={`Matériau ${material.name}`}
			sections={sections}
			menuTitle="Actions"
			menuDescription={material.name}
			className="text-left"
			viewTransitionName={`material-card-${material.id}`}
		>
			<Item
				variant="outline"
				size="sm"
				className={"w-full gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte matériau"
			>
				<ItemMedia variant="icon">
					<SwatchesIcon
						className="text-muted-foreground size-5"
						aria-hidden="true"
						style={{ viewTransitionName: `material-icon-${material.id}` }}
					/>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{material.name}</span>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>
							{variantCount} variante{variantCount !== 1 ? "s" : ""}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</LongPressMenuLink>
	);
}
