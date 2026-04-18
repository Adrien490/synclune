"use client";

import { useUrlParam } from "./use-url-param";

interface UseSelectFilterOptions {
	/** Si true, utilise filterKey directement sans préfixe "filter_" */
	noPrefix?: boolean;
}

/**
 * Hook pour gérer l'état du filtrage avec un select simple.
 * Gère un seul filtre avec une seule valeur (URL-backed, optimiste).
 */
export function useSelectFilter(filterKey: string, options?: UseSelectFilterOptions) {
	const paramKey = options?.noPrefix ? filterKey : `filter_${filterKey}`;
	const { value, update, clear, isPending } = useUrlParam(paramKey);
	return { value, setFilter: update, clearFilter: clear, isPending };
}
