"use client";

import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";

import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	AdminSearchDrawer,
	StickyActionBar,
	type StickyActionBarItem,
} from "@/shared/components/sticky-action-bar";
import { useToolbarDrawer } from "@/shared/hooks";

import { DISCOUNTS_SORT_LABELS } from "../../constants/discount.constants";
import { DiscountsFilterDrawer } from "./discounts-filter-drawer";

const SORT_OPTIONS: SortOption[] = Object.entries(DISCOUNTS_SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

/**
 * Sous-header sticky (mobile, admin) pour la liste codes promo.
 * 3 actions : Trier | Rechercher | Filtrer.
 */
export function DiscountsBottomBar() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();

	const searchParams = useSearchParams();
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const hasActiveFilter =
		searchParams.has("filter_type") ||
		searchParams.has("filter_isActive") ||
		searchParams.has("filter_hasUsages");

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

			<AdminSearchDrawer
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				placeholder="Rechercher un code promo..."
				ariaLabel="Rechercher un code promo"
				scope="discounts"
			/>

			<DiscountsFilterDrawer open={isOpen("filter")} onOpenChange={onOpenChange("filter")} />
		</>
	);
}
