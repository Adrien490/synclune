"use client";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
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
		isActive: boolean;
		_count: { skus: number };
	};
}

export function ColorMobileItem({ color }: ColorMobileItemProps) {
	const skuCount = color._count.skus || 0;
	const statusLabel = color.isActive ? "Actif" : "Inactif";

	const { sections } = useColorActions({
		colorId: color.id,
		colorName: color.name,
		colorHex: color.hex,
		colorSlug: color.slug,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/couleurs/${color.slug}/modifier`}
			ariaLabel={`Couleur ${color.name}`}
			sections={sections}
			menuTitle="Actions"
			menuDescription={color.name}
			className="text-left"
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte couleur"
			>
				<ItemMedia variant="icon">
					<span
						className="border-border size-8 rounded-full border"
						style={{ backgroundColor: color.hex }}
						aria-hidden="true"
					/>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{color.name}</span>
						<Badge variant={color.isActive ? "default" : "secondary"}>{statusLabel}</Badge>
					</ItemTitle>
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
