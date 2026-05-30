"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";

import { SearchInput } from "@/shared/components/search-input";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	StickyActionBar,
	type StickyActionBarItem,
	useSelectionToggleItem,
} from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { ReviewsFilterSheet } from "./reviews-filter-sheet";

const IDS = getAdminDrawerIds("reviews");

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
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "filter">();
	const { hasActiveSort } = useActiveListControls();

	// Reviews use bare keys (status/rating/hasResponse) instead of the filter_* prefix.
	const searchParams = useSearchParams();
	const activeFilterCount = REVIEW_FILTER_KEYS.filter((key) => searchParams.has(key)).length;

	const selectItem = useSelectionToggleItem();

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
		...(selectItem ? [selectItem] : []),
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
						placeholder="Client, produit, contenu…"
						aria-label="Rechercher un avis"
						className="w-full"
					/>
				}
			/>

			<ReviewsFilterSheet
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

export function ReviewsBottomBar() {
	return (
		<Suspense fallback={null}>
			<ReviewsBottomBarInner />
		</Suspense>
	);
}
