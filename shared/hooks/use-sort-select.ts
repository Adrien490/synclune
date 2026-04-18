"use client";

import { useUrlParam } from "./use-url-param";

/**
 * Hook pour gérer le tri via URL param `sortBy` (optimiste).
 */
export function useSortSelect() {
	const { value, update, clear, isPending } = useUrlParam("sortBy");
	return { value, setSort: update, clearSort: clear, isPending };
}
