import { useEffect, useRef, useState, useTransition } from "react";

import { quickSearch } from "@/modules/products/actions/quick-search";
import type { QuickSearchResult } from "@/modules/products/data/quick-search-products";
import { logger } from "@/shared/lib/logger";
import type { SearchInputHandle } from "@/shared/components/search-input";

import { MIN_SEARCH_LENGTH, type QuickSearchError } from "./constants";

export function isSearchError(v: unknown): v is QuickSearchError {
	return v != null && typeof v === "object" && "type" in v;
}

const CACHE_MAX_ENTRIES = 20;
const CACHE_TTL_MS = 30_000;

type CacheEntry = { result: QuickSearchResult; timestamp: number };

function createQuickSearchCache() {
	const store = new Map<string, CacheEntry>();
	return {
		get(key: string): QuickSearchResult | null {
			const entry = store.get(key);
			if (!entry) return null;
			if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
				store.delete(key);
				return null;
			}
			store.delete(key);
			store.set(key, entry);
			return entry.result;
		},
		set(key: string, result: QuickSearchResult) {
			if (result.kind !== "success") return;
			if (store.has(key)) store.delete(key);
			store.set(key, { result, timestamp: Date.now() });
			while (store.size > CACHE_MAX_ENTRIES) {
				const oldestKey = store.keys().next().value;
				if (!oldestKey) break;
				store.delete(oldestKey);
			}
		},
	};
}

interface UseQuickSearchParams {
	searchInputRef: React.RefObject<SearchInputHandle | null>;
	resetActiveIndex: () => void;
}

export function useQuickSearch({ searchInputRef, resetActiveIndex }: UseQuickSearchParams) {
	const [inputValue, setInputValue] = useState("");
	const [searchResults, setSearchResults] = useState<QuickSearchResult | QuickSearchError | null>(
		null,
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, startSearch] = useTransition();
	const latestQueryRef = useRef("");
	const abortControllerRef = useRef<AbortController | null>(null);
	const cacheRef = useRef<ReturnType<typeof createQuickSearchCache> | null>(null);
	cacheRef.current ??= createQuickSearchCache();

	const isSearchMode = inputValue.trim().length >= MIN_SEARCH_LENGTH;

	useEffect(() => {
		return () => abortControllerRef.current?.abort();
	}, []);

	const handleInputValueChange = (value: string) => {
		setInputValue(value);
		resetActiveIndex();
	};

	const handleLiveSearch = (query: string) => {
		const trimmed = query.trim();

		// Abort any in-flight search before starting a new one or resetting state
		abortControllerRef.current?.abort();

		if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) {
			setSearchResults(null);
			setSearchQuery("");
			return;
		}
		setSearchQuery(trimmed);
		latestQueryRef.current = trimmed;

		// Serve from client-side cache if the result is fresh (aligns with "products" cache life)
		const cached = cacheRef.current!.get(trimmed);
		if (cached) {
			setSearchResults(cached);
			return;
		}

		const controller = new AbortController();
		abortControllerRef.current = controller;

		startSearch(async () => {
			try {
				const results = await quickSearch(trimmed);
				// Discard stale results if user has already typed a new query or unmounted
				if (controller.signal.aborted) return;
				if (latestQueryRef.current !== trimmed) return;
				cacheRef.current!.set(trimmed, results);
				setSearchResults(results);
			} catch (error) {
				if (controller.signal.aborted) return;
				if (latestQueryRef.current !== trimmed) return;
				logger.error("[QuickSearch] Search failed:", error);
				setSearchResults({ type: "error" });
			}
		});
	};

	const handleSearchFromSuggestion = (term: string) => {
		searchInputRef.current?.setValue(term);
		setInputValue(term);
		handleLiveSearch(term);
	};

	const reset = () => {
		abortControllerRef.current?.abort();
		setInputValue("");
		setSearchResults(null);
		setSearchQuery("");
		resetActiveIndex();
	};

	return {
		inputValue,
		searchResults,
		searchQuery,
		isSearching,
		isSearchMode,
		handleInputValueChange,
		handleLiveSearch,
		handleSearchFromSuggestion,
		reset,
	};
}
