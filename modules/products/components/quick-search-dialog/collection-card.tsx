"use client"

import Image from "next/image"
import Link from "next/link"
import { Layers } from "lucide-react"

import { Tap } from "@/shared/components/animations/tap"
import { cn } from "@/shared/utils/cn"

import type { QuickSearchCollection } from "./types"

interface CollectionCardProps {
	collection: QuickSearchCollection
	onSelect: () => void
	onMouseEnter?: (element: HTMLElement) => void
	/** Compact variant for search results, full variant for idle */
	variant?: "compact" | "full"
}

export function CollectionCard({
	collection,
	onSelect,
	onMouseEnter,
	variant = "full",
}: CollectionCardProps) {
	const isCompact = variant === "compact"

	return (
		<Tap scale={0.97}>
			<Link
				href={`/collections/${collection.slug}`}
				onClick={onSelect}
				onMouseEnter={(e) => onMouseEnter?.(e.currentTarget)}
				data-active={undefined}
				className={cn(
					"flex items-center gap-2 rounded-xl transition-all text-left",
					"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
					"data-[active=true]:bg-muted",
					isCompact
						? "justify-between px-3 py-2.5 hover:bg-muted"
						: cn(
								"px-3 py-3 min-h-12",
								"bg-muted/40 hover:bg-muted border border-transparent hover:border-border",
								"data-[active=true]:border-border"
							)
				)}
			>
				<div className={cn("flex items-center gap-2 min-w-0", !isCompact && "flex-1")}>
					{collection.image ? (
						<div className="size-8 shrink-0 rounded-lg overflow-hidden bg-muted">
							<Image
								src={collection.image.url}
								alt=""
								width={32}
								height={32}
								className="size-full object-cover"
								{...(collection.image.blurDataUrl ? { placeholder: "blur", blurDataURL: collection.image.blurDataUrl } : {})}
							/>
						</div>
					) : isCompact ? (
						<Layers className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
					) : null}
					<span className="font-medium truncate">{collection.name}</span>
				</div>
				<span className={cn(
					"shrink-0 text-xs tabular-nums",
					isCompact
						? "text-muted-foreground/60"
						: "text-muted-foreground/60 group-hover/collection:text-muted-foreground transition-colors"
				)}>
					{collection.productCount}
				</span>
			</Link>
		</Tap>
	)
}
