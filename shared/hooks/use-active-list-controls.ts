"use client";

import { useSearchParams } from "next/navigation";

/**
 * Reads the standard listing search params used across the 11 admin lists
 * (search / sortBy / filter_*) and returns derived booleans for the
 * StickyActionBar items.
 *
 * `filterPrefix` defaults to `"filter_"` (Synclune convention). Pass a custom
 * prefix if a module uses a different naming.
 *
 * @example
 * ```tsx
 * const { hasActiveSearch, hasActiveSort, hasActiveFilter, activeFilterCount } =
 *   useActiveListControls();
 *
 * const items: StickyActionBarItem[] = [
 *   { ..., active: hasActiveSort },
 *   { ..., active: hasActiveSearch },
 *   { ..., badgeCount: activeFilterCount },
 * ];
 * ```
 */
export function useActiveListControls(filterPrefix = "filter_") {
	const sp = useSearchParams();
	const search = sp.get("search") ?? "";
	const sortBy = sp.get("sortBy");
	// Compte les filtres ayant une valeur non-vide (un `?filter_status=` orphelin
	// — pris en charge p.ex. en clear partiel — ne doit pas être considéré actif).
	const filterCount = Array.from(sp.entries()).filter(
		([k, v]) => k.startsWith(filterPrefix) && v !== "",
	).length;

	return {
		hasActiveSearch: search !== "",
		searchValue: search,
		hasActiveSort: sortBy !== null,
		sortValue: sortBy,
		activeFilterCount: filterCount,
		hasActiveFilter: filterCount > 0,
	};
}
