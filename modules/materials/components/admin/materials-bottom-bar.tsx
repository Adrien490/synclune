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

import { MATERIALS_SORT_LABELS } from "../../constants/materials.constants";

const SORT_OPTIONS: SortOption[] = Object.entries(MATERIALS_SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

/**
 * Sous-header sticky (mobile, admin) pour la liste matériaux.
 * 2 actions : Trier | Rechercher.
 */
export function MaterialsBottomBar() {
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
				placeholder="Nom, slug, description..."
				ariaLabel="Rechercher un materiau"
				scope="materials"
			/>
		</>
	);
}
