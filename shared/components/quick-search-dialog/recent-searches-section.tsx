"use client"

import { Clock, Search, X } from "lucide-react"

import { Stagger } from "@/shared/components/animations/stagger"
import { Tap } from "@/shared/components/animations/tap"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { useAddRecentSearch } from "@/shared/hooks/use-add-recent-search"
import { useClearRecentSearches } from "@/shared/hooks/use-clear-recent-searches"
import { useRemoveRecentSearch } from "@/shared/hooks/use-remove-recent-search"
import { QUICK_SEARCH_DIALOG_ID } from "./constants"

interface RecentSearchesSectionProps {
	initialSearches: string[]
	onSearch: (term: string) => void
}

/**
 * Self-sufficient recent searches section.
 * Manages its own state via hooks and handles navigation.
 */
export function RecentSearchesSection({
	initialSearches,
	onSearch,
}: RecentSearchesSectionProps) {
	const { close } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const { add } = useAddRecentSearch()
	const { searches, remove } = useRemoveRecentSearch({ initialSearches })
	const { clear } = useClearRecentSearches({ initialSearches })

	if (searches.length === 0) return null

	const handleSearch = (term: string) => {
		add(term)
		onSearch(term)
		close()
	}

	return (
		<section>
			<div className="flex items-center justify-between mb-3">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
					<Clock className="size-4" />
					Recherches recentes
				</h2>
				<button
					type="button"
					onClick={clear}
					className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-11 px-3 -mr-3"
				>
					Effacer
				</button>
			</div>
			<Stagger className="space-y-1" stagger={0.025} delay={0.05} y={8}>
				{searches.map((term) => (
					<div key={term} className="flex items-center gap-1 group">
						<Tap className="flex-1">
							<button
								type="button"
								onClick={() => handleSearch(term)}
								className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
							>
								<Search className="size-4 text-muted-foreground shrink-0" />
								<span className="flex-1 truncate">{term}</span>
							</button>
						</Tap>
						<button
							type="button"
							onClick={() => remove(term)}
							className="size-10 flex items-center justify-center hover:bg-muted rounded-lg transition-all shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
							aria-label={`Supprimer "${term}"`}
						>
							<X className="size-4" />
						</button>
					</div>
				))}
			</Stagger>
		</section>
	)
}
