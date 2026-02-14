import { useState, useTransition } from "react"

import { quickSearch } from "@/modules/products/actions/quick-search"
import type { QuickSearchResult } from "@/modules/products/data/quick-search-products"
import type { SearchInputHandle } from "@/shared/components/search-input"

import { MIN_SEARCH_LENGTH } from "./constants"

interface UseQuickSearchParams {
	searchInputRef: React.RefObject<SearchInputHandle | null>
	resetActiveIndex: () => void
}

export function useQuickSearch({ searchInputRef, resetActiveIndex }: UseQuickSearchParams) {
	const [inputValue, setInputValue] = useState("")
	const [searchResults, setSearchResults] = useState<QuickSearchResult | "error" | null>(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [isSearching, startSearch] = useTransition()

	const isSearchMode = inputValue.trim().length > 0

	const handleInputValueChange = (value: string) => {
		setInputValue(value)
		resetActiveIndex()
	}

	const handleLiveSearch = (query: string) => {
		const trimmed = query.trim()
		if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) {
			setSearchResults(null)
			setSearchQuery("")
			return
		}
		setSearchQuery(trimmed)
		startSearch(async () => {
			try {
				const results = await quickSearch(trimmed)
				setSearchResults(results)
			} catch {
				setSearchResults("error")
			}
		})
	}

	const handleSearchFromSuggestion = (term: string) => {
		searchInputRef.current?.setValue(term)
		setInputValue(term)
		handleLiveSearch(term)
	}

	const reset = () => {
		setInputValue("")
		setSearchResults(null)
		setSearchQuery("")
		resetActiveIndex()
	}

	return {
		searchResults,
		searchQuery,
		isSearching,
		isSearchMode,
		handleInputValueChange,
		handleLiveSearch,
		handleSearchFromSuggestion,
		reset,
	}
}
