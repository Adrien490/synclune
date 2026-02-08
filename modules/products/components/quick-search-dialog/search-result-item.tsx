"use client"

import Image from "next/image"
import Link from "next/link"

import { Tap } from "@/shared/components/animations/tap"
import { formatEuro } from "@/shared/utils/format-euro"
import { cn } from "@/shared/utils/cn"

import type { QuickSearchProduct } from "../../data/quick-search-products"
import { HighlightMatch } from "./highlight-match"

interface SearchResultItemProps {
	product: QuickSearchProduct
	query: string
	onSelect: () => void
	onMouseEnter?: (element: HTMLElement) => void
}

const MAX_COLOR_SWATCHES = 3

/**
 * Compact product result item for the quick search dialog.
 * Shows thumbnail, title with highlighted match, price, and color swatches.
 */
export function SearchResultItem({ product, query, onSelect, onMouseEnter }: SearchResultItemProps) {
	const defaultSku = product.skus.find((s) => s.isDefault) ?? product.skus[0]
	if (!defaultSku) return null

	const image = defaultSku.images[0]
	const isOutOfStock = product.skus.every((s) => s.inventory <= 0)

	// Collect unique colors
	const colors = product.skus
		.map((s) => s.color)
		.filter((c): c is NonNullable<typeof c> => c !== null)
		.filter((c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i)

	const extraColors = colors.length > MAX_COLOR_SWATCHES ? colors.length - MAX_COLOR_SWATCHES : 0

	return (
		<Tap scale={0.97}>
			<Link
				href={`/creations/${product.slug}`}
				onClick={onSelect}
				onMouseEnter={(e) => onMouseEnter?.(e.currentTarget)}
				className={cn(
					"flex items-center gap-3 px-3 py-2.5 rounded-xl",
					"hover:bg-muted transition-colors",
					"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
					"min-h-[56px]",
					"data-[active=true]:bg-muted"
				)}
			>
				{/* Thumbnail */}
				<div className="size-12 shrink-0 rounded-lg overflow-hidden bg-muted">
					{image ? (
						<Image
							src={image.url}
							alt={image.altText ?? product.title}
							width={48}
							height={48}
							className="size-full object-cover"
							{...(image.blurDataUrl ? { placeholder: "blur", blurDataURL: image.blurDataUrl } : {})}
						/>
					) : (
						<div className="size-full bg-muted" />
					)}
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium truncate">
						<HighlightMatch text={product.title} query={query} />
					</p>
					<div className="flex items-center gap-2 mt-0.5">
						{/* Price */}
						<span className="text-sm text-muted-foreground">
							{formatEuro(defaultSku.priceInclTax)}
						</span>
						{defaultSku.compareAtPrice && defaultSku.compareAtPrice > defaultSku.priceInclTax && (
							<span className="text-xs text-muted-foreground/50 line-through">
								{formatEuro(defaultSku.compareAtPrice)}
							</span>
						)}

						{/* Out of stock badge */}
						{isOutOfStock && (
							<span className="text-xs text-destructive font-medium">
								Rupture
							</span>
						)}
					</div>
				</div>

				{/* Color swatches */}
				{colors.length > 0 && (
					<div className="flex items-center gap-1 shrink-0">
						{colors.slice(0, MAX_COLOR_SWATCHES).map((color) => (
							<span
								key={color.slug}
								className="size-2 rounded-full border border-border/50"
								style={{ backgroundColor: color.hex }}
								title={color.name}
								aria-hidden="true"
							/>
						))}
						{extraColors > 0 && (
							<span className="text-[10px] text-muted-foreground/60">
								+{extraColors}
							</span>
						)}
					</div>
				)}
			</Link>
		</Tap>
	)
}
