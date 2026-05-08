"use client";

import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Plus, Search, SlidersHorizontal } from "lucide-react";

import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	AdminQuickSearchDialog,
	StickyActionBar,
	type StickyActionBarItem,
} from "@/shared/components/sticky-action-bar";
import { useToolbarDrawer } from "@/shared/hooks";

import { PRODUCT_TYPES_SORT_LABELS } from "../../constants/product-type.constants";
import { productTypesAdminQuickSearchAdapter } from "./product-types-quick-search-adapter";
import { ProductTypesFilterSheet } from "./product-types-filter-sheet";

const SORT_OPTIONS: SortOption[] = Object.entries(PRODUCT_TYPES_SORT_LABELS).map(
	([value, label]) => ({
		value,
		label,
	}),
);

/**
 * Sous-header sticky (mobile, admin) pour la liste types de produits.
 * 4 actions : Filtrer | Rechercher | Ajouter | Trier.
 */
export function ProductTypesBottomBar() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();

	const searchParams = useSearchParams();
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const activeFilterCount = Array.from(searchParams.keys()).filter((key) =>
		key.startsWith("filter_"),
	).length;

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
			kind: "link",
			key: "add",
			icon: Plus,
			label: "Ajouter",
			ariaLabel: "Créer un nouveau type de produit",
			href: "/admin/catalogue/types-de-produits/nouveau",
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
			<StickyActionBar items={items} ariaLabel="Filtres, recherche, ajout et tri" />

			<ProductTypesFilterSheet
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

			<AdminQuickSearchDialog
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				adapter={productTypesAdminQuickSearchAdapter}
			/>
		</>
	);
}
