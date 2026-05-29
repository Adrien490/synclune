/**
 * Stable DOM ids for admin list toolbar drawers (sort / filter).
 *
 * Shared between the trigger button (`StickyActionBar` `controls` prop, wired
 * as `aria-controls`) and the drawer content node (`SortDrawer.id`,
 * `FilterSheetWrapper.id`). Keeping both in sync lets AT announce which popup a
 * button operates. Search is no longer a drawer — it's a persistent inline
 * `SearchInput` in the bar's `search` slot, so no id is needed for it.
 *
 * @example
 * ```ts
 * const IDS = getAdminDrawerIds("products");
 * // → { filter: "admin-products-filter-drawer", sort: "admin-products-sort-drawer" }
 * ```
 */
export function getAdminDrawerIds(module: string) {
	return {
		filter: `admin-${module}-filter-drawer`,
		sort: `admin-${module}-sort-drawer`,
	} as const;
}
