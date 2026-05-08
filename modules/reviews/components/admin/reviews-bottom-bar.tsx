"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";

import { AdminSearchDrawerTop } from "@/shared/components/admin-search-drawer-top";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { useToolbarDrawer } from "@/shared/hooks";

import { ReviewsFilterSheet } from "./reviews-filter-sheet";

const SORT_OPTIONS: SortOption[] = [
	{ value: "createdAt-desc", label: "Plus recents" },
	{ value: "createdAt-asc", label: "Plus anciens" },
	{ value: "rating-desc", label: "Meilleures notes" },
	{ value: "rating-asc", label: "Notes les plus basses" },
];

const REVIEW_FILTER_KEYS = ["status", "rating", "hasResponse"] as const;

/**
 * Sous-header sticky (mobile, admin) pour la liste avis.
 * 3 actions : Filtrer | Rechercher | Trier.
 */
function ReviewsBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();

	const searchParams = useSearchParams();
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const activeFilterCount = REVIEW_FILTER_KEYS.filter((key) => searchParams.has(key)).length;

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

			<ReviewsFilterSheet
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

			<AdminSearchDrawerTop
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				placeholder="Client, produit, contenu…"
				ariaLabel="Rechercher un avis"
			/>
		</>
	);
}

export function ReviewsBottomBar() {
	return (
		<Suspense fallback={null}>
			<ReviewsBottomBarInner />
		</Suspense>
	);
}
