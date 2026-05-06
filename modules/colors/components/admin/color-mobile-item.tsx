"use client";

import { Badge } from "@/shared/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";

import { COLOR_ITEM_DRAWER_ID, type ColorItemDrawerData } from "./color-item-drawer";

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
	const { open } = useDialog<ColorItemDrawerData>(COLOR_ITEM_DRAWER_ID);
	const haptic = useHaptic();
	const skuCount = color._count.skus || 0;
	const statusLabel = color.isActive ? "Actif" : "Inactif";

	const handleOpen = () => {
		haptic("selection");
		open({
			color: {
				id: color.id,
				name: color.name,
				hex: color.hex,
				slug: color.slug,
				isActive: color.isActive,
				skuCount,
			},
		});
	};

	return (
		<button
			type="button"
			aria-label={`Couleur ${color.name}`}
			onClick={handleOpen}
			className={cn(
				"focus-visible:ring-primary w-full rounded-lg text-left",
				"focus-visible:ring-2 focus-visible:outline-none",
				"transform-gpu active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
			)}
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
		</button>
	);
}
