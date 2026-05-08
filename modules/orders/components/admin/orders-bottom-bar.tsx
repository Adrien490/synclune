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

import { SORT_LABELS } from "../../constants/order.constants";
import { OrdersFilterDrawer } from "./orders-filter-drawer";
import { ordersAdminQuickSearchAdapter } from "./orders-quick-search-adapter";

const SORT_OPTIONS: SortOption[] = Object.entries(SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

/**
 * Sous-header sticky (mobile, admin) pour la liste commandes.
 * 3 actions : Trier | Rechercher | Filtrer.
 */
function OrdersBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();

	const searchParams = useSearchParams();
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const hasActiveFilter =
		searchParams.has("filter_status") ||
		searchParams.has("filter_paymentStatus") ||
		searchParams.has("filter_totalMin") ||
		searchParams.has("filter_totalMax") ||
		searchParams.has("filter_createdAfter") ||
		searchParams.has("filter_createdBefore") ||
		searchParams.has("filter_showDeleted");

	const items: StickyActionBarItem[] = [
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
		{
			key: "filter",
			icon: SlidersHorizontal,
			label: "Filtrer",
			ariaLabel: hasActiveFilter ? "Filtre actif. Modifier le filtre" : "Ouvrir les filtres",
			onClick: () => open("filter"),
			active: hasActiveFilter,
			haspopup: "dialog",
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
			/>

			<AdminQuickSearchDialog
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				adapter={ordersAdminQuickSearchAdapter}
			/>

			<OrdersFilterDrawer open={isOpen("filter")} onOpenChange={onOpenChange("filter")} />
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
