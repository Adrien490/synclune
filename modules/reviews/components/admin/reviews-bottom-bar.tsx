"use client";

import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search } from "lucide-react";

import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	AdminSearchDrawer,
	StickyActionBar,
	type StickyActionBarItem,
} from "@/shared/components/sticky-action-bar";
import { useToolbarDrawer } from "@/shared/hooks";

const SORT_OPTIONS: SortOption[] = [
	{ value: "createdAt-desc", label: "Plus recents" },
	{ value: "createdAt-asc", label: "Plus anciens" },
	{ value: "rating-desc", label: "Meilleures notes" },
	{ value: "rating-asc", label: "Notes les plus basses" },
];

/**
 * Sous-header sticky (mobile, admin) pour la liste avis.
 * 2 actions : Trier | Rechercher.
 */
export function ReviewsBottomBar() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search">();

	const searchParams = useSearchParams();
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");

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
	];

	return (
		<>
			<StickyActionBar items={items} ariaLabel="Tri et recherche" />

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
			/>

			<AdminSearchDrawer
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				placeholder="Client, produit..."
				ariaLabel="Rechercher un avis"
				scope="reviews"
			/>
		</>
	);
}
