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
	/** Compact variant for search results, full variant for idle */
	variant?: "compact" | "full"
}

export function CollectionCard({
	collection,
	onSelect,
	variant = "full",
}: CollectionCardProps) {
	if (variant === "compact") {
		return (
			<Tap scale={0.97}>
				<Link
					href={`/collections/${collection.slug}`}
					onClick={onSelect}
					data-active={undefined}
					className={cn(
						"flex items-center gap-2 rounded-xl transition-all text-left",
						"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
						"data-[active=true]:bg-muted",
						"justify-between px-3 py-2.5 hover:bg-muted"
					)}
				>
					<div className="flex items-center gap-2 min-w-0">
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
						) : (
							<Layers className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
						)}
						<span className="font-medium truncate">{collection.name}</span>
					</div>
					<span className="shrink-0 text-xs tabular-nums text-muted-foreground/60">
						{collection.productCount}
					</span>
				</Link>
			</Tap>
		)
	}

	// Full variant — horizontal card matching CategoryCard style
	return (
		<Tap scale={0.97}>
			<Link
				href={`/collections/${collection.slug}`}
				onClick={onSelect}
				data-active={undefined}
				className={cn(
					"flex items-center gap-3 rounded-xl px-4 py-3",
					"bg-muted/40 hover:bg-muted border border-transparent hover:border-border",
					"transition-all",
					"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
					"data-[active=true]:border-border"
				)}
			>
				{collection.image ? (
					<div className="size-10 shrink-0 rounded-lg overflow-hidden bg-muted">
						<Image
							src={collection.image.url}
							alt=""
							width={40}
							height={40}
							className="size-full object-cover"
							{...(collection.image.blurDataUrl ? { placeholder: "blur", blurDataURL: collection.image.blurDataUrl } : {})}
						/>
					</div>
				) : (
					<div className="size-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
						<Layers className="size-4 text-muted-foreground/40" aria-hidden="true" />
					</div>
				)}
				<div className="min-w-0">
					<span className="text-sm font-medium line-clamp-1">{collection.name}</span>
					<span className="block text-xs tabular-nums text-muted-foreground/60">
						{collection.productCount} produit{collection.productCount > 1 ? "s" : ""}
					</span>
				</div>
			</Link>
		</Tap>
	)
}
