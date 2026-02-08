"use client"

import { ChevronRight, Clock, Eye, Layers, Search, Sparkles, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Stagger } from "@/shared/components/animations/stagger"
import { Tap } from "@/shared/components/animations/tap"
import ScrollFade from "@/shared/components/scroll-fade"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"
import { formatEuro } from "@/shared/utils/format-euro"

import { CollectionCard } from "./collection-card"
import { CategoryCard } from "./category-card"
import type { QuickSearchCollection, QuickSearchProductType, RecentlyViewedProduct } from "./types"

interface IdleContentProps {
	recentlyViewed: RecentlyViewedProduct[]
	searches: string[]
	collections: QuickSearchCollection[]
	productTypes: QuickSearchProductType[]
	onClose: () => void
	onRecentSearch: (term: string) => void
	onRemoveSearch: (term: string) => void
	onClearSearches: () => void
	onMouseEnter: (element: HTMLElement) => void
	isPending: boolean
}

export function IdleContent({
	recentlyViewed,
	searches,
	collections,
	productTypes,
	onClose,
	onRecentSearch,
	onRemoveSearch,
	onClearSearches,
	onMouseEnter,
	isPending,
}: IdleContentProps) {
	const hasContent = searches.length > 0 || collections.length > 0 || productTypes.length > 0 || recentlyViewed.length > 0

	return (
		<ScrollFade axis="vertical" hideScrollbar={false} className="h-full">
			<div className="px-4 py-4 space-y-6">
				{/* Recently Viewed Products */}
				{recentlyViewed.length > 0 && (
					<section aria-labelledby="recently-viewed-heading">
						<div className="flex items-center mb-3">
							<h2 id="recently-viewed-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
								<Eye className="size-5" aria-hidden="true" />
								Vus recemment
							</h2>
						</div>
						<ScrollFade axis="horizontal" className="-mx-4 px-4">
							<div className="flex gap-3">
								{recentlyViewed.map((product) => (
									<Tap key={product.slug} scale={0.97}>
										<Link
											href={`/creations/${product.slug}`}
											onClick={onClose}
											className={cn(
												"flex flex-col items-center gap-2 w-24 shrink-0",
												"rounded-xl p-2 transition-colors",
												"hover:bg-muted",
												"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
											)}
										>
											<div className="size-20 rounded-lg overflow-hidden bg-muted shrink-0">
												{product.image ? (
													<Image
														src={product.image.url}
														alt={product.title}
														width={80}
														height={80}
														className="size-full object-cover"
														{...(product.image.blurDataUrl ? { placeholder: "blur", blurDataURL: product.image.blurDataUrl } : {})}
													/>
												) : (
													<div className="size-full bg-muted" />
												)}
											</div>
											<div className="w-full text-center min-w-0">
												<p className="text-xs font-medium truncate">{product.title}</p>
												<p className="text-xs text-muted-foreground">{formatEuro(product.price)}</p>
											</div>
										</Link>
									</Tap>
								))}
							</div>
						</ScrollFade>
					</section>
				)}

				{/* Recent Searches */}
				{searches.length > 0 && (
					<section aria-labelledby="recent-searches-heading">
						<div className="flex items-center justify-between mb-3">
							<h2 id="recent-searches-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
								<Clock className="size-5" aria-hidden="true" />
								Recherches recentes
							</h2>
							<Button
								variant="ghost"
								size="sm"
								onClick={onClearSearches}
								disabled={isPending}
								className="text-xs h-auto py-1.5 px-2.5 -mr-2 hover:text-destructive"
								aria-label="Effacer toutes les recherches recentes"
							>
								Effacer
							</Button>
						</div>
						<Stagger role="list" className="space-y-1" stagger={0.02} delay={0.02} y={8}>
							{searches.map((term) => (
								<div key={term} role="listitem" className="flex items-center gap-1 group/item">
									<Tap className="flex-1 min-w-0" scale={0.97}>
										<button
											type="button"
											onClick={() => onRecentSearch(term)}
											disabled={isPending}
											onMouseEnter={(e) => onMouseEnter(e.currentTarget)}
											data-active={undefined}
											className={cn(
												"w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left font-medium",
												"hover:bg-muted",
												"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
												"disabled:opacity-50",
												"data-[active=true]:bg-muted"
											)}
										>
											<Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
											<span className="flex-1 truncate">{term}</span>
										</button>
									</Tap>
									<button
										type="button"
										onClick={() => onRemoveSearch(term)}
										disabled={isPending}
										className="size-11 flex items-center justify-center rounded-xl transition-all shrink-0 text-muted-foreground/40 md:opacity-0 md:group-hover/item:opacity-100 group-focus-within/item:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
										aria-label={`Supprimer "${term}"`}
									>
										<X className="size-4" />
									</button>
								</div>
							))}
						</Stagger>
					</section>
				)}

				{/* Collections */}
				{collections.length > 0 && (
					<section aria-labelledby="collections-heading">
						<div className="flex items-center mb-3">
							<h2 id="collections-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
								<Layers className="size-5" aria-hidden="true" />
								Collections
							</h2>
						</div>
						<Stagger role="list" className="grid grid-cols-2 gap-2" stagger={0.02} delay={0.03} y={8}>
							{collections.map((collection) => (
								<div key={collection.slug} role="listitem">
									<CollectionCard
										collection={collection}
										onSelect={onClose}
										onMouseEnter={onMouseEnter}
									/>
								</div>
							))}
						</Stagger>
						<div className="mt-3 text-center">
							<Link
								href="/collections"
								onClick={onClose}
								className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-md px-2 py-1"
							>
								Voir toutes les collections
								<ChevronRight className="size-4" aria-hidden="true" />
							</Link>
						</div>
					</section>
				)}

				{/* Product Types */}
				{productTypes.length > 0 && (
					<section aria-labelledby="categories-heading">
						<div className="flex items-center justify-between mb-3">
							<h2 id="categories-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
								<Sparkles className="size-5" aria-hidden="true" />
								Categories
							</h2>
							<span className="text-xs text-muted-foreground/60">
								{productTypes.length} type{productTypes.length > 1 ? "s" : ""}
							</span>
						</div>
						<Stagger role="list" className="grid grid-cols-2 gap-2" stagger={0.02} delay={0.04} y={8}>
							{productTypes.map((type) => (
								<div key={type.slug} role="listitem">
									<CategoryCard
										type={type}
										onSelect={onClose}
										onMouseEnter={onMouseEnter}
									/>
								</div>
							))}
						</Stagger>
					</section>
				)}

				{/* Empty State */}
				{!hasContent && (
					<Stagger className="text-center py-8" role="status" stagger={0.03} delay={0.05} y={10}>
						<Search className="size-10 text-muted-foreground/20 mx-auto mb-4" aria-hidden="true" />
						<p className="text-sm text-muted-foreground">
							Trouvez votre prochain bijou
						</p>
					</Stagger>
				)}
			</div>
		</ScrollFade>
	)
}
