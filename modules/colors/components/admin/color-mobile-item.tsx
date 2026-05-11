"use client";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Badge } from "@/shared/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";

import { useColorActions } from "../../hooks/use-color-actions";

interface ColorMobileItemProps {
	color: {
		id: string;
		name: string;
		hex: string;
		slug: string;
		description: string | null;
		isActive: boolean;
		_count: { skus: number };
	};
}

export function ColorMobileItem({ color }: ColorMobileItemProps) {
	const skuCount = color._count.skus || 0;
	const statusLabel = color.isActive ? "● Actif" : "○ Inactif";
	const hexUpper = color.hex.toUpperCase();

	const { sections } = useColorActions({
		colorId: color.id,
		colorName: color.name,
		colorHex: color.hex,
		colorSlug: color.slug,
		colorDescription: color.description,
	});

	return (
		<MobileSelectableCard
			id={color.id}
			itemLabel={`Couleur ${color.name}`}
			longPressProps={{
				href: `/admin/catalogue/couleurs/${color.slug}`,
				ariaLabel: `Couleur ${color.name}`,
				sections,
				menuTitle: "Actions",
				menuDescription: color.name,
				className: "text-left",
				viewTransitionName: `color-card-${color.id}`,
			}}
		>
			<Item variant="outline" size="sm" className="w-full gap-3">
				<ItemMedia variant="icon">
					<span
						className="border-border size-8 rounded-full border"
						style={{ backgroundColor: color.hex }}
						role="img"
						aria-label={`Aperçu couleur ${hexUpper}`}
					/>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{color.name}</span>
						<Badge
							variant={color.isActive ? "default" : "secondary"}
							style={{ viewTransitionName: `color-status-${color.id}` }}
						>
							{statusLabel}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="text-muted-foreground font-mono text-xs">{hexUpper}</span>
						<span aria-hidden="true">·</span>
						<span>
							{skuCount} variante{skuCount !== 1 ? "s" : ""}
						</span>
					</ItemDescription>
					{color.description && (
						<ItemDescription className="text-muted-foreground line-clamp-1 text-xs italic">
							{color.description}
						</ItemDescription>
					)}
				</ItemContent>
			</Item>
		</MobileSelectableCard>
	);
}
