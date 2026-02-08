"use client"

import { use } from "react"
import { ChevronRight, Layers, Search, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Tap } from "@/shared/components/animations/tap"
import ScrollFade from "@/shared/components/scroll-fade"
import { useAddRecentSearch } from "@/modules/products/hooks/use-add-recent-search"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { cn } from "@/shared/utils/cn"

import type { QuickSearchResult } from "../../data/quick-search-products"
import { QUICK_SEARCH_DIALOG_ID } from "./constants"
import { SearchResultItem } from "./search-result-item"

interface QuickSearchContentProps {
	resultsPromise: Promise<QuickSearchResult>
	query: string
	collections: Array<{
		slug: string
		name: string
		productCount: number
		image: { url: string; blurDataUrl: string | null } | null
	}>
	productTypes: Array<{ slug: string; label: string }>
}

export function QuickSearchContent({
	resultsPromise,
	query,
	collections,
	productTypes,
}: QuickSearchContentProps) {
	const { products, suggestion, totalCount } = use(resultsPromise)
	const { close } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const router = useRouter()
	const { add } = useAddRecentSearch()

	// Client-side filtering of collections/categories
	const matchedCollections = collections
		.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
		.slice(0, 2)
	const matchedTypes = productTypes
		.filter((t) => t.label.toLowerCase().includes(query.toLowerCase()))
		.slice(0, 2)

	const hasSearchResults = products.length > 0
	const hasMatchedNav = matchedCollections.length > 0 || matchedTypes.length > 0
	const showEmptyState = !hasSearchResults && !hasMatchedNav && !suggestion

	const handleSuggestionClick = (term: string) => {
		router.replace(`?qs=${encodeURIComponent(term)}`, { scroll: false })
	}

	const handleSelectResult = () => {
		close()
	}

	const handleViewAllResults = () => {
		add(query)
		router.push(`/produits?search=${encodeURIComponent(query)}`)
		close()
	}

	const handleMouseEnter = (_element: HTMLElement) => {
		// Keyboard navigation handled by parent dialog
	}

	return (
		<>
			<ScrollFade axis="vertical" hideScrollbar={false} className="h-full">
				<div className="px-4 py-4 space-y-4">
					{/* Spell suggestion */}
					{suggestion && (
						<p className="text-sm text-muted-foreground">
							Vouliez-vous dire{" "}
							<button
								type="button"
								onClick={() => handleSuggestionClick(suggestion)}
								className="font-medium text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-sm"
							>
								{suggestion}
							</button>
							{" ?"}
						</p>
					)}

					{/* Matched collections */}
					{matchedCollections.length > 0 && (
						<section aria-label="Collections correspondantes">
							<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
								Collections
							</h3>
							<div className="space-y-1">
								{matchedCollections.map((collection) => (
									<Tap key={collection.slug} scale={0.97}>
										<Link
											href={`/collections/${collection.slug}`}
											onClick={handleSelectResult}
											onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
											data-active={undefined}
											className={cn(
												"flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-colors",
												"hover:bg-muted",
												"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
												"data-[active=true]:bg-muted"
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
											<span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">
												{collection.productCount}
											</span>
										</Link>
									</Tap>
								))}
							</div>
						</section>
					)}

					{/* Matched product types */}
					{matchedTypes.length > 0 && (
						<section aria-label="Categories correspondantes">
							<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
								Categories
							</h3>
							<div className="space-y-1">
								{matchedTypes.map((type) => (
									<Tap key={type.slug} scale={0.97}>
										<Link
											href={`/produits/${type.slug}`}
											onClick={handleSelectResult}
											onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
											data-active={undefined}
											className={cn(
												"flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors",
												"hover:bg-muted",
												"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
												"data-[active=true]:bg-muted"
											)}
										>
											<Sparkles className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
											<span className="font-medium truncate">{type.label}</span>
										</Link>
									</Tap>
								))}
							</div>
						</section>
					)}

					{/* Product results */}
					{hasSearchResults && (
						<section aria-label="Produits">
							<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
								Produits
							</h3>
							<div className="space-y-0.5">
								{products.map((product) => (
									<SearchResultItem
										key={product.id}
										product={product}
										query={query}
										onSelect={handleSelectResult}
										onMouseEnter={handleMouseEnter}
									/>
								))}
							</div>
						</section>
					)}

					{/* Empty state */}
					{showEmptyState && (
						<div className="text-center py-8">
							<Search className="size-10 text-muted-foreground/20 mx-auto mb-4" aria-hidden="true" />
							<p className="text-sm text-muted-foreground">
								Aucun resultat pour &ldquo;{query}&rdquo;
							</p>
						</div>
					)}
				</div>
			</ScrollFade>

			{/* Footer: View all results */}
			{totalCount > 0 && (
				<div className="sticky bottom-0 px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm">
					<button
						type="button"
						onClick={handleViewAllResults}
						onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
						data-active={undefined}
						className={cn(
							"w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
							"text-sm font-medium text-primary",
							"hover:bg-primary/5 transition-colors",
							"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
							"data-[active=true]:bg-primary/5"
						)}
					>
						Voir les {totalCount} resultat{totalCount > 1 ? "s" : ""}
						<ChevronRight className="size-4" aria-hidden="true" />
					</button>
				</div>
			)}
		</>
	)
}
