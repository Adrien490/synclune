"use client";

import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import type { QuickSearchProductType } from "./constants";

interface QuickTagPillsProps {
	productTypes: QuickSearchProductType[];
	onSelect: (label: string) => void;
	/** "sm" for idle mode, "xs" for empty state */
	size?: "sm" | "xs";
	centered?: boolean;
}

export function QuickTagPills({
	productTypes,
	onSelect,
	size = "sm",
	centered = false,
}: QuickTagPillsProps) {
	if (productTypes.length === 0) return null;

	return (
		<div
			role="group"
			aria-label="Suggestions de categories"
			className={cn("flex flex-wrap gap-1.5", centered && "justify-center")}
		>
			{productTypes.map((type) => (
				<button
					key={type.slug}
					type="button"
					aria-label={`Rechercher ${type.label}`}
					onClick={() => {
						triggerHaptic("selection");
						onSelect(type.label);
					}}
					className={cn(
						"bg-muted/30 hover:bg-muted inline-flex items-center justify-center rounded-full border",
						size === "sm" ? "text-sm" : "text-xs",
						"min-h-11 px-3.5 py-1.5 sm:min-h-9 sm:px-3",
						"touch-manipulation transition-colors",
						"focus-ring",
					)}
				>
					{type.label}
				</button>
			))}
		</div>
	);
}
