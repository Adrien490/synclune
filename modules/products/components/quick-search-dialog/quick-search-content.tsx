"use client";

import { ChevronRight, Lightbulb, Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ScrollFade from "@/shared/components/scroll-fade";
import { matchesWordStart } from "@/modules/products/utils/match-word-start";

import type { QuickSearchResult } from "../../data/quick-search-products";
import { CategoryCard } from "./category-card";
import { CollectionCard } from "./collection-card";
import { MAX_MATCHED_COLLECTIONS, MAX_MATCHED_TYPES } from "./constants";
import type { QuickSearchCollection, QuickSearchProductType } from "./constants";
import { QuickTagPills } from "./quick-tag-pills";
import { SearchResultItem } from "./search-result-item";

interface QuickSearchContentProps {
	results: QuickSearchResult;
	query: string;
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	onSearch: (query: string) => void;
	onClose: () => void;
	onSelectResult: () => void;
	onViewAllResults: () => void;
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
	const { products, suggestion, totalCount } = results;

	// Client-side filtering of collections/categories (word-start match)
	const lowerQuery = query.toLowerCase();
	const matchedCollections = collections
		.filter((c) => matchesWordStart(c.name, lowerQuery))
		.slice(0, MAX_MATCHED_COLLECTIONS);
	const matchedTypes = productTypes
		.filter((t) => matchesWordStart(t.label, lowerQuery))
		.slice(0, MAX_MATCHED_TYPES);

	const hasSearchResults = products.length > 0;
	const hasMatchedNav = matchedCollections.length > 0 || matchedTypes.length > 0;
	const showEmptyState = !hasSearchResults && !hasMatchedNav && !suggestion;

	return (
		<div className="flex h-full flex-col">
			{/* Screen reader announcement (replaces Suspense fallback "Recherche en cours...") */}
			<div role="status" aria-live="polite" className="sr-only">
				{totalCount} resultat{totalCount !== 1 ? "s" : ""} trouve{totalCount !== 1 ? "s" : ""}.
			</div>

			<ScrollFade axis="vertical" hideScrollbar={false} className="min-h-0 flex-1">
				<div className="space-y-4 px-4 py-4">
					{/* Spell suggestion */}
					{suggestion && (
						<p className="text-muted-foreground text-sm">
							Vouliez-vous dire{" "}
							<button
								type="button"
								aria-label={`Rechercher ${suggestion}`}
								onClick={() => onSearch(suggestion)}
								className="text-foreground decoration-primary/40 hover:decoration-primary focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								{suggestion}
							</button>
							{" ?"}
						</p>
					)}

					{/* Matched collections */}
					{matchedCollections.length > 0 && (
						<section aria-label="Collections correspondantes">
							<h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
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
							<h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
								Categories
							</h3>
							<div className="space-y-1">
								{matchedTypes.map((type) => (
									<CategoryCard key={type.slug} type={type} onSelect={onClose} variant="compact" />
								))}
							</div>
						</section>
					)}

					{/* Product results */}
					{hasSearchResults && (
						<section aria-label="Produits">
							<h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
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
						<div className="space-y-4 py-8 text-center">
							<Search
								className="text-muted-foreground/20 mx-auto mb-2 size-10"
								aria-hidden="true"
							/>
							<p className="text-muted-foreground text-sm">
								Aucun resultat pour &ldquo;{query}&rdquo;
							</p>
							<div className="space-y-3 pt-2">
								<p className="text-muted-foreground/70 flex items-center justify-center gap-1.5 text-xs">
									<Lightbulb className="size-3.5" aria-hidden="true" />
									Essayez avec moins de mots ou parcourez nos categories
								</p>
								<QuickTagPills productTypes={productTypes} onSelect={onSearch} size="xs" centered />
							</div>
						</div>
					)}
				</div>
			</ScrollFade>

			{/* Footer: View all results */}
			{totalCount > 0 && (
				<div className="border-border bg-background/95 shrink-0 border-t px-4 py-3 backdrop-blur-sm">
					<Button
						onClick={onViewAllResults}
						data-active={undefined}
						className="data-[active=true]:ring-ring/50 w-full data-[active=true]:ring-[3px]"
					>
						{totalCount === 1 ? "Voir le resultat" : `Voir les ${totalCount} resultats`}
						<ChevronRight className="size-4" aria-hidden="true" />
					</Button>
				</div>
			)}
		</div>
	);
}
