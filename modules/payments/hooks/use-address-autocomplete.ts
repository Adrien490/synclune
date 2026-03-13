"use client";

import { useEffect, useState, useTransition } from "react";
import { searchAddressForCheckout } from "@/modules/addresses/data/search-address";
import type { SearchAddressResult } from "@/modules/addresses/types/search-address.types";
import type { ShippingCountry } from "@/shared/constants/countries";

interface UseAddressAutocompleteReturn {
	suggestions: SearchAddressResult[];
	isSearching: boolean;
	error: string | null;
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

	useEffect(() => {
		if (query.length < 2) return;

		startTransition(async () => {
			const result = await searchAddressForCheckout({ text: query, country });
			setResults(result.addresses);
			if (result.error) {
				setError("La recherche d'adresses a echoue. Reessayez.");
			} else {
				setError(null);
			}
		});
	}, [query, country]);

	const suggestions = query.length < 2 ? [] : results;

	return { suggestions, isSearching, error };
}
