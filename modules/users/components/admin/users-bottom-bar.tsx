"use client";

import { Suspense } from "react";
import { ArrowUpDown, Filter, Search } from "lucide-react";

import { AdminSearchDrawerTop } from "@/shared/components/admin-search-drawer-top";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { USERS_SORT_LABELS } from "../../constants/user.constants";
import { UsersFilterSheet } from "./users-filter-sheet";

const SORT_OPTIONS: SortOption[] = Object.entries(USERS_SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

/**
 * Sous-header sticky (mobile, admin) pour la liste clients.
 * 3 actions : Filtrer | Trier | Rechercher.
 */
function UsersBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();
	const { hasActiveSearch, searchValue, hasActiveSort, hasActiveFilter, activeFilterCount } =
		useActiveListControls();

	const items: StickyActionBarItem[] = [
		{
			key: "filter",
			icon: Filter,
			label: "Filtrer",
			ariaLabel: "Ouvrir les filtres",
			onClick: () => open("filter"),
			badgeCount: activeFilterCount,
			haspopup: "dialog",
			expanded: isOpen("filter"),
			announcement: hasActiveFilter ? "Filtres actifs" : undefined,
		},
		{
			key: "sort",
			icon: ArrowUpDown,
			label: "Trier",
			ariaLabel: hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri",
			onClick: () => open("sort"),
			active: hasActiveSort,
			haspopup: "dialog",
			expanded: isOpen("sort"),
			announcement: hasActiveSort ? "Tri actif" : undefined,
		},
		{
			key: "search",
			icon: Search,
			label: "Rechercher",
			ariaLabel: hasActiveSearch
				? `Recherche: "${searchValue}". Modifier la recherche`
				: "Ouvrir la recherche",
			onClick: () => open("search"),
			active: hasActiveSearch,
			haspopup: "dialog",
			expanded: isOpen("search"),
			announcement: hasActiveSearch ? `Recherche "${searchValue}" active` : undefined,
		},
	];

	return (
		<>
			<StickyActionBar items={items} ariaLabel="Filtres, tri et recherche" />

			<UsersFilterSheet open={isOpen("filter")} onOpenChange={onOpenChange("filter")} hideTrigger />

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
			/>

			<AdminSearchDrawerTop
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				placeholder="Nom, email…"
				ariaLabel="Rechercher un client par nom ou email"
			/>
		</>
	);
}

export function UsersBottomBar() {
	return (
		<Suspense fallback={null}>
			<UsersBottomBarInner />
		</Suspense>
	);
}
