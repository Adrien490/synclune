"use client";

import Image from "next/image";
import Link from "next/link";

import { Tap } from "@/shared/components/animations/tap";
import { Skeleton, SkeletonGroup, SkeletonText } from "@/shared/components/ui/skeleton";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";

import { SEARCH_SYNONYMS } from "../../constants/search-synonyms";
import type { QuickSearchProduct } from "../../data/quick-search-products";
import { SKELETON_ROWS } from "./constants";

interface SearchResultItemProps {
	product: QuickSearchProduct;
	query: string;
	onSelect: () => void;
}

const MAX_COLOR_SWATCHES = 3;

/**
 * Compact product result item for the quick search dialog.
 * Shows thumbnail, title with highlighted match, price, and color swatches.
 */
export function SearchResultItem({ product, query, onSelect }: SearchResultItemProps) {
	const defaultSku = product.skus.find((s) => s.isDefault) ?? product.skus[0];
	if (!defaultSku) return null;

	const image = defaultSku.images[0];
	const isOutOfStock = product.skus.every((s) => s.inventory <= 0);

	// Expand query words with synonyms for highlighting
	// (e.g. searching "anneau" also highlights "bague" in the title)
	const synonymTerms = query
		.split(/\s+/)
		.filter(Boolean)
		.flatMap((word) => SEARCH_SYNONYMS.get(word.toLowerCase()) ?? []);

	// Collect unique colors
	const seen = new Set<string>();
	const colors = product.skus.reduce<NonNullable<(typeof product.skus)[number]["color"]>[]>(
		(acc, s) => {
			if (s.color && !seen.has(s.color.slug)) {
				seen.add(s.color.slug);
				acc.push(s.color);
			}
			return acc;
		},
		[],
	);

	const extraColors = colors.length > MAX_COLOR_SWATCHES ? colors.length - MAX_COLOR_SWATCHES : 0;

	return (
		<Tap scale={0.97}>
			<Link
				href={`/creations/${product.slug}`}
				onClick={onSelect}
				data-active={undefined}
				className={cn(
					"group/result flex items-center gap-3 rounded-xl px-3 py-2.5",
					"hover:bg-muted transition-colors",
					"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
					"min-h-14",
					"data-[active=true]:bg-muted",
				)}
			>
				{/* Thumbnail */}
				<div className="bg-muted size-12 shrink-0 overflow-hidden rounded-lg">
					{image ? (
						<Image
							src={image.url}
							alt={image.altText ?? product.title}
							width={48}
							height={48}
							sizes="48px"
							className="size-full object-cover transition-transform duration-200 group-hover/result:scale-110"
							placeholder={image.blurDataUrl ? "blur" : "empty"}
							blurDataURL={image.blurDataUrl ?? undefined}
						/>
					) : (
						<div className="bg-muted size-full" />
					)}
				</div>

				{/* Content */}
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">
						<HighlightMatch text={product.title} query={query} synonyms={synonymTerms} />
					</p>
					<div className="mt-0.5 flex items-center gap-2">
						{/* Price */}
						<span className="text-muted-foreground text-sm">
							{formatEuro(defaultSku.priceInclTax)}
						</span>
						{defaultSku.compareAtPrice && defaultSku.compareAtPrice > defaultSku.priceInclTax && (
							<>
								<span className="text-muted-foreground/50 text-xs line-through">
									{formatEuro(defaultSku.compareAtPrice)}
								</span>
								<span className="bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 text-[10px] font-medium">
									-{Math.round((1 - defaultSku.priceInclTax / defaultSku.compareAtPrice) * 100)}%
								</span>
							</>
						)}

						{/* Out of stock badge */}
						{isOutOfStock && <span className="text-destructive text-xs font-medium">Rupture</span>}
					</div>
				</div>

				{/* Color swatches */}
				{colors.length > 0 && (
					<div
						className="flex shrink-0 items-center gap-1"
						role="img"
						aria-label={`Couleurs : ${colors.map((c) => c.name).join(", ")}`}
					>
						{colors.slice(0, MAX_COLOR_SWATCHES).map((color) => (
							<span
								key={color.slug}
								className="border-border/50 size-2 rounded-full border"
								style={{ backgroundColor: color.hex }}
								aria-hidden="true"
							/>
						))}
						{extraColors > 0 && (
							<span className="text-muted-foreground/60 text-[10px]" aria-hidden="true">
								+{extraColors}
							</span>
						)}
					</div>
				)}
			</Link>
		</Tap>
	);
}

/**
 * Skeleton for quick search results matching the SearchResultItem layout.
 */
export function SearchResultsSkeleton() {
	return (
		<SkeletonGroup label="Chargement des resultats..." className="space-y-2 px-4">
			{Array.from({ length: SKELETON_ROWS }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 py-2">
					<Skeleton shape="rounded" className="size-12 shrink-0" />
					<div className="min-w-0 flex-1">
						<SkeletonText lines={2} />
					</div>
				</div>
			))}
		</SkeletonGroup>
	);
}

/**
 * Highlights matching substrings in text by wrapping them in <mark>.
 * Case-insensitive, escapes regex special characters.
 * Uses index-based alternation: odd indices from split(/(pattern)/) are matches.
 *
 * Accepts optional synonyms to highlight terms that matched via synonym expansion
 * (e.g. searching "anneau" highlights "Bague" in "Bague Lune").
 */
export function HighlightMatch({
	text,
	query,
	synonyms,
}: {
	text: string;
	query: string;
	synonyms?: string[];
}) {
	const allTerms = [query, ...(synonyms ?? [])].map((t) => t.trim()).filter(Boolean);

	if (allTerms.length === 0) {
		return <>{text}</>;
	}

	const escaped = allTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	const regex = new RegExp(`(${escaped.join("|")})`, "gi");
	const parts = text.split(regex);

	return (
		<>
			{parts.map((part, i) =>
				i % 2 === 1 ? (
					<mark key={i} className="bg-primary/15 text-foreground rounded-sm font-medium">
						{part}
					</mark>
				) : (
					<span key={i}>{part}</span>
				),
			)}
		</>
	);
}
