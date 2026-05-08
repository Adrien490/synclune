"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";

import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	AdminQuickSearchDialog,
	StickyActionBar,
	type StickyActionBarItem,
} from "@/shared/components/sticky-action-bar";
import { useToolbarDrawer } from "@/shared/hooks";

import { SORT_LABELS } from "../../constants/refund.constants";
import { refundsAdminQuickSearchAdapter } from "./refunds-quick-search-adapter";
import { RefundsFilterSheet } from "./refunds-filter-sheet";

const SORT_OPTIONS: SortOption[] = Object.entries(SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

/**
 * Sous-header sticky (mobile, admin) pour la liste remboursements.
 * 3 actions : Filtrer | Rechercher | Trier.
 */
function RefundsBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();
	const searchParams = useSearchParams();

	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const activeFilterCount = Array.from(searchParams.keys()).filter((key) =>
		key.startsWith("filter_"),
	).length;

	const items: StickyActionBarItem[] = [
		{
			key: "filter",
			icon: SlidersHorizontal,
			label: "Filtrer",
			ariaLabel:
				activeFilterCount > 0
					? `${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""} actif${activeFilterCount > 1 ? "s" : ""}. Modifier les filtres`
					: "Ouvrir les filtres",
			onClick: () => open("filter"),
			badgeCount: activeFilterCount,
			haspopup: "dialog",
			announcement:
				activeFilterCount > 0
					? `${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""} actif${activeFilterCount > 1 ? "s" : ""}`
					: undefined,
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
	];

	return (
		<>
			<StickyActionBar items={items} ariaLabel="Filtres, recherche et tri" />

			<RefundsFilterSheet
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				hideTrigger
			/>

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
			/>

			<AdminQuickSearchDialog
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				adapter={refundsAdminQuickSearchAdapter}
			/>
		</>
	);
}

export function RefundsBottomBar() {
	return (
		<Suspense fallback={null}>
			<RefundsBottomBarInner />
		</Suspense>
	);
}
