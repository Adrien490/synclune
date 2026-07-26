"use client";

import { Gem } from "lucide-react";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
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
		slug: string;
		description: string | null;
		isActive: boolean;
		_count: { skus: number };
	};
}

export function MaterialMobileItem({ material }: MaterialMobileItemProps) {
	const skuCount = material._count.skus;
	const statusLabel = material.isActive ? "● Actif" : "○ Inactif";

	const { sections } = useMaterialActions({
		materialId: material.id,
		materialName: material.name,
		materialSlug: material.slug,
		materialDescription: material.description,
		materialIsActive: material.isActive,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/materiaux/${material.slug}`}
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
					<Gem
						className="text-muted-foreground size-5"
						aria-hidden="true"
						style={{ viewTransitionName: `material-icon-${material.id}` }}
					/>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{material.name}</span>
						<Badge
							variant={material.isActive ? "default" : "secondary"}
							style={{ viewTransitionName: `material-status-${material.id}` }}
						>
							{statusLabel}
						</Badge>
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
		</LongPressMenuLink>
	);
}
