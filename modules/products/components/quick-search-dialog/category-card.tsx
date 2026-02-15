"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"

import { Tap } from "@/shared/components/animations/tap"
import { cn } from "@/shared/utils/cn"

import type { QuickSearchProductType } from "./constants"

interface CategoryCardProps {
	type: QuickSearchProductType
	onSelect: () => void
	/** Compact variant for search results, full variant for idle */
	variant?: "compact" | "full"
}

export function CategoryCard({
	type,
	onSelect,
	variant = "full",
}: CategoryCardProps) {
	const isCompact = variant === "compact"

	return (
		<Tap scale={0.97}>
			<Link
				href={`/produits/${type.slug}`}
				onClick={onSelect}
				data-active={undefined}
				className={cn(
					"rounded-xl transition-all text-left font-medium",
					"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
					"data-[active=true]:bg-muted",
					isCompact
						? "flex items-center gap-2 px-3 py-2.5 hover:bg-muted"
						: cn(
								"block px-4 py-3 min-h-12",
								"bg-muted/40 hover:bg-muted border border-transparent hover:border-border",
								"data-[active=true]:border-border"
							)
				)}
			>
				{isCompact && (
					<Sparkles className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
				)}
				<span className={isCompact ? "truncate" : undefined}>{type.label}</span>
			</Link>
		</Tap>
	)
}
