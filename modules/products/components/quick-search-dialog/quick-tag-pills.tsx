"use client"

import { cn } from "@/shared/utils/cn"

import type { QuickSearchProductType } from "./constants"

interface QuickTagPillsProps {
	productTypes: QuickSearchProductType[]
	onSelect: (label: string) => void
	/** "sm" for idle mode, "xs" for empty state */
	size?: "sm" | "xs"
	centered?: boolean
}

export function QuickTagPills({
	productTypes,
	onSelect,
	size = "sm",
	centered = false,
}: QuickTagPillsProps) {
	if (productTypes.length === 0) return null

	return (
		<div role="group" aria-label="Suggestions de categories" className={cn("flex flex-wrap gap-1.5", centered && "justify-center")}>
			{productTypes.map((type) => (
				<button
					key={type.slug}
					type="button"
					onClick={() => onSelect(type.label)}
					className={cn(
						"rounded-full border bg-muted/30 hover:bg-muted",
						size === "sm" ? "text-sm" : "text-xs",
						"px-3 py-1.5",
						"transition-colors",
						"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					)}
				>
					{type.label}
				</button>
			))}
		</div>
	)
}
