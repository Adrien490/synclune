"use client";

import { Suspense } from "react";
import { ArrowUpDown, Filter } from "lucide-react";

import { SearchInput } from "@/shared/components/search-input";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { USERS_SORT_LABELS } from "../../constants/user.constants";
import { UsersFilterSheet } from "./users-filter-sheet";

const SORT_OPTIONS: SortOption[] = Object.entries(USERS_SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

const IDS = getAdminDrawerIds("users");

/**
 * Sous-header sticky (mobile, admin) pour la liste clients.
 * 3 actions : Filtrer | Trier | Rechercher.
 */
function UsersBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "filter">();
	const { hasActiveSort, hasActiveFilter, activeFilterCount } = useActiveListControls();

	const items: StickyActionBarItem[] = [
		{
			key: "filter",
			icon: Filter,
			label: "Filtrer",
			ariaLabel: "Ouvrir les filtres",
			onClick: () => open("filter"),
			badgeCount: activeFilterCount,
			haspopup: "dialog",
			controls: IDS.filter,
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
			controls: IDS.sort,
			expanded: isOpen("sort"),
			announcement: hasActiveSort ? "Tri actif" : undefined,
		},
	];

	return (
		<>
			<StickyActionBar
				items={items}
				ariaLabel="Recherche, filtres et tri"
				search={
					<SearchInput
						size="sm"
						paramName="search"
						placeholder="Nom, email…"
						aria-label="Rechercher un client par nom ou email"
						className="w-full"
					/>
				}
			/>

			<UsersFilterSheet
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				hideTrigger
				id={IDS.filter}
			/>

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
				id={IDS.sort}
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
