"use client";

import { Suspense } from "react";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";

import { AdminSearchDrawerTop } from "@/shared/components/admin-search-drawer-top";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { SORT_LABELS } from "../../constants/order.constants";
import { OrdersFilterDrawer } from "./orders-filter-drawer";

const SORT_OPTIONS: SortOption[] = Object.entries(SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

const IDS = getAdminDrawerIds("orders");

/**
 * Sous-header sticky (mobile, admin) pour la liste commandes.
 * 3 actions : Trier | Rechercher | Filtrer.
 */
function OrdersBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();
	const { hasActiveSearch, searchValue, hasActiveSort, hasActiveFilter, activeFilterCount } =
		useActiveListControls();

	const items: StickyActionBarItem[] = [
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
			key: "filter",
			icon: SlidersHorizontal,
			label: "Filtrer",
			ariaLabel: "Ouvrir les filtres",
			onClick: () => open("filter"),
			badgeCount: activeFilterCount,
			haspopup: "dialog",
			controls: IDS.filter,
			expanded: isOpen("filter"),
			announcement: hasActiveFilter ? "Filtres actifs" : undefined,
		},
	];

	return (
		<>
			<StickyActionBar items={items} ariaLabel="Tri, recherche et filtres" />

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
				title="Filtrer les commandes"
				placeholder="Numéro, email, client…"
				ariaLabel="Rechercher une commande par numéro, email ou client"
				id={IDS.search}
			/>

			<OrdersFilterDrawer
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				id={IDS.filter}
			/>
		</>
	);
}

export function OrdersBottomBar() {
	return (
		<Suspense fallback={null}>
			<OrdersBottomBarInner />
		</Suspense>
	);
}
