"use client"

import { ChevronRight, Lightbulb, Search } from "lucide-react"

import ScrollFade from "@/shared/components/scroll-fade"
import { cn } from "@/shared/utils/cn"

import type { QuickSearchResult } from "../../data/quick-search-products"
import { CollectionCard } from "./collection-card"
import { CategoryCard } from "./category-card"
import { MAX_MATCHED_COLLECTIONS, MAX_MATCHED_TYPES } from "./constants"
import { QuickTagPills } from "./quick-tag-pills"
import { SearchResultItem } from "./search-result-item"
import type { QuickSearchCollection, QuickSearchProductType } from "./types"

interface QuickSearchContentProps {
	results: QuickSearchResult
	query: string
	collections: QuickSearchCollection[]
	productTypes: QuickSearchProductType[]
	onSearch: (query: string) => void
	onClose: () => void
	onSelectResult: () => void
	onViewAllResults: () => void
}

export function QuickSearchContent({
	results,
	query,
	collections,
	productTypes,
	onSearch,
	onClose,
	onSelectResult,
	onViewAllResults,
}: QuickSearchContentProps) {
	const { products, suggestion, totalCount } = results

	// Client-side filtering of collections/categories (word-start match)
	const lowerQuery = query.toLowerCase()
	const matchedCollections = collections
		.filter((c) => matchesWordStart(c.name, lowerQuery))
		.slice(0, MAX_MATCHED_COLLECTIONS)
	const matchedTypes = productTypes
		.filter((t) => matchesWordStart(t.label, lowerQuery))
		.slice(0, MAX_MATCHED_TYPES)

	const hasSearchResults = products.length > 0
	const hasMatchedNav = matchedCollections.length > 0 || matchedTypes.length > 0
	const showEmptyState = !hasSearchResults && !hasMatchedNav && !suggestion

	return (
		<>
			{/* Screen reader announcement (replaces Suspense fallback "Recherche en cours...") */}
			<div role="status" aria-live="polite" className="sr-only">
				{totalCount} resultat{totalCount !== 1 ? "s" : ""} trouve{totalCount !== 1 ? "s" : ""}.
			</div>

			<ScrollFade axis="vertical" hideScrollbar={false} className="h-full">
				<div className="px-4 py-4 space-y-4">
					{/* Spell suggestion */}
					{suggestion && (
						<p className="text-sm text-muted-foreground">
							Vouliez-vous dire{" "}
							<button
								type="button"
								onClick={() => onSearch(suggestion)}
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
									<CollectionCard
										key={collection.slug}
										collection={collection}
										onSelect={onClose}
										variant="compact"
									/>
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
									<CategoryCard
										key={type.slug}
										type={type}
										onSelect={onClose}
										variant="compact"
									/>
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
										onSelect={onSelectResult}
									/>
								))}
							</div>
						</section>
					)}

					{/* Empty state */}
					{showEmptyState && (
						<div className="text-center py-8 space-y-4">
							<Search className="size-10 text-muted-foreground/20 mx-auto mb-2" aria-hidden="true" />
							<p className="text-sm text-muted-foreground">
								Aucun resultat pour &ldquo;{query}&rdquo;
							</p>
							<div className="space-y-3 pt-2">
								<p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5">
									<Lightbulb className="size-3.5" aria-hidden="true" />
									Essayez avec moins de mots ou parcourez nos categories
								</p>
								<QuickTagPills
									productTypes={productTypes}
									onSelect={onSearch}
									size="xs"
									centered
								/>
							</div>
						</div>
					)}
				</div>
			</ScrollFade>

			{/* Footer: View all results */}
			{totalCount > 0 && (
				<div className="sticky bottom-0 px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm">
					<button
						type="button"
						onClick={onViewAllResults}
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

/** Match query against word starts in text (e.g. "or" matches "Oreilles" but not "Colorees") */
export function matchesWordStart(text: string, query: string): boolean {
	const lowerText = text.toLowerCase()
	// Full-text match: text starts with query OR query starts with text
	if (lowerText.startsWith(query) || query.startsWith(lowerText)) return true
	// Word-start match: any word in the text starts with the query
	const words = lowerText.split(/\s+/)
	return words.some((word) => word.startsWith(query))
}
