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
	const filterCount = Array.from(sp.keys()).filter((k) => k.startsWith(filterPrefix)).length;

	return {
		hasActiveSearch: search !== "",
		searchValue: search,
		hasActiveSort: sortBy !== null,
		sortValue: sortBy,
		activeFilterCount: filterCount,
		hasActiveFilter: filterCount > 0,
	};
}
