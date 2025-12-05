"use client";

import { cn } from "@/shared/utils/cn";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { ColorSwatch } from "@/modules/products/services/product-list-helpers";

interface ColorSwatchesProps {
	colors: ColorSwatch[];
	maxVisible?: number;
	size?: "sm" | "md";
	className?: string;
}

const sizeClasses = {
	sm: "size-4",
	md: "size-5",
};

/**
 * Pastilles couleur pour ProductCard
 * Affiche les couleurs disponibles sous forme de petits cercles colorés
 * avec un badge +N si plus de maxVisible couleurs
 */
export function ColorSwatches({
	colors,
	maxVisible = 4,
	size = "sm",
	className,
}: ColorSwatchesProps) {
	if (colors.length === 0) return null;

	const visibleColors = colors.slice(0, maxVisible);
	const remainingCount = colors.length - maxVisible;

	return (
		<div
			className={cn("flex items-center gap-1.5", className)}
			aria-label={`${colors.length} couleur${colors.length > 1 ? "s" : ""} disponible${colors.length > 1 ? "s" : ""}`}
		>
			{visibleColors.map((color) => (
				<Tooltip key={color.slug}>
					<TooltipTrigger asChild>
						<span
							className={cn(
								"rounded-full border border-border/50 shadow-sm transition-opacity",
								sizeClasses[size],
								!color.inStock && "opacity-40"
							)}
							style={{ backgroundColor: color.hex }}
							aria-label={`${color.name}${!color.inStock ? " (rupture)" : ""}`}
						/>
					</TooltipTrigger>
					<TooltipContent side="top" className="text-xs">
						{color.name}
						{!color.inStock && " (rupture)"}
					</TooltipContent>
				</Tooltip>
			))}
			{remainingCount > 0 && (
				<span
					className={cn(
						"flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium",
						sizeClasses[size]
					)}
					aria-label={`${remainingCount} autres couleurs`}
				>
					+{remainingCount}
				</span>
			)}
		</div>
	);
}
