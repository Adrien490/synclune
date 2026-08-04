"use client";

import { Suspense } from "react";
import { ArrowsDownUpIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/ssr";

import { SearchInput } from "@/shared/components/search-input";
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
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "filter">();
	const { hasActiveSort, hasActiveFilter, activeFilterCount } = useActiveListControls();

	const items: StickyActionBarItem[] = [
		{
			key: "sort",
			icon: ArrowsDownUpIcon,
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
			key: "filter",
			icon: SlidersHorizontalIcon,
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
			<StickyActionBar
				items={items}
				ariaLabel="Recherche, tri et filtres"
				search={
					<SearchInput
						size="sm"
						paramName="search"
						placeholder="Numéro, email, client…"
						aria-label="Rechercher une commande par numéro, email ou client"
						className="w-full"
					/>
				}
			/>

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
				id={IDS.sort}
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
