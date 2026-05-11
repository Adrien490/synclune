/**
 * Stable DOM ids for admin list toolbar drawers (sort / search / filter).
 *
 * Shared between the trigger button (`StickyActionBar` `controls` prop, wired
 * as `aria-controls`) and the drawer content node (`SortDrawer.id`,
 * `AdminSearchDrawerTop.id`, `FilterSheetWrapper.id`). Keeping both in sync
 * lets AT announce which popup a button operates.
 *
 * @example
 * ```ts
 * const IDS = getAdminDrawerIds("products");
 * // → { filter: "admin-products-filter-drawer", sort: "admin-products-sort-drawer", search: "admin-products-search-drawer" }
 * ```
 */
export function getAdminDrawerIds(module: string) {
	return {
		filter: `admin-${module}-filter-drawer`,
		sort: `admin-${module}-sort-drawer`,
		search: `admin-${module}-search-drawer`,
	} as const;
}
