"use client";

import { Suspense } from "react";
import { ArrowUpDown, Plus, Search, SlidersHorizontal } from "lucide-react";

import { AdminSearchDrawerTop } from "@/shared/components/admin-search-drawer-top";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { DISCOUNTS_SORT_LABELS } from "../../constants/discount.constants";
import { DiscountsFilterDrawer } from "./discounts-filter-drawer";

const SORT_OPTIONS: SortOption[] = Object.entries(DISCOUNTS_SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

const IDS = getAdminDrawerIds("discounts");

/**
 * Sous-header sticky (mobile, admin) pour la liste codes promo.
 * 4 actions : Filtrer | Rechercher | Ajouter | Trier.
 */
function DiscountsBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();
	const { hasActiveSearch, searchValue, hasActiveSort, activeFilterCount } =
		useActiveListControls();

	const items: StickyActionBarItem[] = [
		{
			key: "filter",
			icon: SlidersHorizontal,
			label: "Filtrer",
			ariaLabel: "Ouvrir les filtres",
			onClick: () => open("filter"),
			badgeCount: activeFilterCount,
			haspopup: "dialog",
			controls: IDS.filter,
			expanded: isOpen("filter"),
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
				? `Recherche: "${searchValue}". Modifier la recherche`
				: "Ouvrir la recherche",
			onClick: () => open("search"),
			active: hasActiveSearch,
			haspopup: "dialog",
			controls: IDS.search,
			expanded: isOpen("search"),
			announcement: hasActiveSearch ? `Recherche "${searchValue}" active` : undefined,
		},
		{
			kind: "link",
			key: "add",
			icon: Plus,
			label: "Ajouter",
			ariaLabel: "Créer un nouveau code promo",
			href: "/admin/marketing/discounts/nouveau",
			viewTransitionName: "admin-add-action",
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
			<StickyActionBar items={items} ariaLabel="Filtres, recherche, ajout et tri" />

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
				id={IDS.sort}
			/>

			<AdminSearchDrawerTop
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				placeholder="Code promo…"
				ariaLabel="Rechercher un code promo"
				id={IDS.search}
			/>

			<DiscountsFilterDrawer
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				id={IDS.filter}
			/>
		</>
	);
}

export function DiscountsBottomBar() {
	return (
		<Suspense fallback={null}>
			<DiscountsBottomBarInner />
		</Suspense>
	);
}
