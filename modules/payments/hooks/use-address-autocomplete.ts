"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchAddressForCheckout } from "@/modules/addresses/actions/search-address";
import type { SearchAddressResult } from "@/modules/addresses/types/search-address.types";
import type { ShippingCountry } from "@/shared/constants/countries";

interface UseAddressAutocompleteReturn {
	suggestions: SearchAddressResult[];
	isSearching: boolean;
	error: string | null;
	retry: () => void;
}

/**
 * Hook for checkout address autocomplete.
 * Triggers search when query changes (already debounced by Autocomplete component).
 * Routes to IGN (France) or Geoapify (other EU) via the server action.
 */
export function useAddressAutocomplete(
	query: string,
	country: ShippingCountry,
): UseAddressAutocompleteReturn {
	const [results, setResults] = useState<SearchAddressResult[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isSearching, startTransition] = useTransition();
	const requestIdRef = useRef(0);
	const [retryCount, setRetryCount] = useState(0);

	// Clear results when country changes (render-time sync)
	const [prevCountry, setPrevCountry] = useState(country);
	if (prevCountry !== country) {
		setPrevCountry(country);
		setResults([]);
		setError(null);
	}

	useEffect(() => {
		if (query.length < 2) return;

		const currentRequestId = ++requestIdRef.current;
		const abortController = new AbortController();

		startTransition(async () => {
			const result = await searchAddressForCheckout({ text: query, country });

			// Ignore stale/aborted responses
			if (abortController.signal.aborted || currentRequestId !== requestIdRef.current) return;

			setResults(result.addresses);
			setError(result.error ? "La recherche d'adresses a échoué. Réessaie." : null);
		});

		return () => abortController.abort();
	}, [query, country, retryCount]);

	const suggestions = query.length < 2 ? [] : results;

	const retry = () => setRetryCount((c) => c + 1);

	return { suggestions, isSearching, error, retry };
}
