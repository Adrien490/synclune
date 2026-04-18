"use client";

import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Filter, Search } from "lucide-react";

import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	AdminSearchDrawer,
	StickyActionBar,
	type StickyActionBarItem,
} from "@/shared/components/sticky-action-bar";
import { useToolbarDrawer } from "@/shared/hooks";

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
export function UsersBottomBar() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();

	const searchParams = useSearchParams();
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const hasActiveFilter = Array.from(searchParams.keys()).some((key) => key.startsWith("filter_"));

	const items: StickyActionBarItem[] = [
		{
			key: "filter",
			icon: Filter,
			label: "Filtrer",
			ariaLabel: hasActiveFilter ? "Filtres actifs. Modifier les filtres" : "Ouvrir les filtres",
			onClick: () => open("filter"),
			active: hasActiveFilter,
			haspopup: "dialog",
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
			announcement: hasActiveSort ? "Tri actif" : undefined,
		},
		{
			key: "search",
			icon: Search,
			label: "Rechercher",
			ariaLabel: hasActiveSearch
				? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
				: "Ouvrir la recherche",
			onClick: () => open("search"),
			active: hasActiveSearch,
			haspopup: "dialog",
			announcement: hasActiveSearch
				? `Recherche "${searchParams.get("search")}" active`
				: undefined,
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

			<AdminSearchDrawer
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				placeholder="Nom, email..."
				ariaLabel="Rechercher un client"
				scope="users"
			/>
		</>
	);
}
