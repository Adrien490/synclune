"use client";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
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
		hex: string | null;
		_count: { variants: number };
	};
}

export function ColorMobileItem({ color }: ColorMobileItemProps) {
	const variantCount = color._count.variants || 0;
	const hexUpper = color.hex?.toUpperCase() ?? null;

	const { sections } = useColorActions({
		colorId: color.id,
		colorName: color.name,
		colorHex: color.hex,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/couleurs/${color.id}`}
			ariaLabel={`Couleur ${color.name}`}
			sections={sections}
			menuTitle="Actions"
			menuDescription={color.name}
			className="text-left"
			viewTransitionName={`color-card-${color.id}`}
		>
			<Item
				variant="outline"
				size="sm"
				className={"w-full gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte couleur"
			>
				<ItemMedia variant="icon">
					<span
						className="border-border size-8 rounded-full border"
						style={{
							backgroundColor: color.hex ?? undefined,
							viewTransitionName: `color-swatch-${color.id}`,
						}}
						aria-hidden="true"
					/>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{color.name}</span>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						{hexUpper ? (
							<>
								<span className="text-muted-foreground font-mono text-xs">{hexUpper}</span>
								<span aria-hidden="true">·</span>
							</>
						) : null}
						<span>
							{variantCount} variante{variantCount !== 1 ? "s" : ""}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</LongPressMenuLink>
	);
}
