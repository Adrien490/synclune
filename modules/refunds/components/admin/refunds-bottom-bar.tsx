"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";

import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	AdminSearchDrawer,
	StickyActionBar,
	type StickyActionBarItem,
} from "@/shared/components/sticky-action-bar";
import { useToolbarDrawer } from "@/shared/hooks";

import { SORT_LABELS } from "../../constants/refund.constants";

const SORT_OPTIONS: SortOption[] = Object.entries(SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

/**
 * Sous-header sticky (mobile, admin) pour la liste remboursements.
 * 3 actions : Trier | Rechercher | Filtrer (délégué à RefundsFilterSheet
 * desktop via un param d'URL, conservé du design précédent).
 */
export function RefundsBottomBar() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search">();
	const searchParams = useSearchParams();
	const router = useRouter();

	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const hasActiveFilter =
		searchParams.has("filter_status") ||
		searchParams.has("filter_reason") ||
		searchParams.has("filter_createdAfter") ||
		searchParams.has("filter_createdBefore");

	const handleOpenFilterSheet = () => {
		const params = new URLSearchParams(searchParams);
		params.set("_filterOpen", "true");
		router.push(`?${params.toString()}`, { scroll: false });
	};

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
			ariaLabel: hasActiveFilter ? "Filtres actifs. Modifier les filtres" : "Ouvrir les filtres",
			onClick: handleOpenFilterSheet,
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
				placeholder="Numero de commande, email..."
				ariaLabel="Rechercher un remboursement"
			/>
		</>
	);
}
