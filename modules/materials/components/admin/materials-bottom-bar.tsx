"use client";

import { Suspense } from "react";
import { ArrowUpDown, Plus, SlidersHorizontal } from "lucide-react";

import { SearchInput } from "@/shared/components/search-input";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { MATERIALS_SORT_LABELS } from "../../constants/materials.constants";
import { MaterialsFilterSheet } from "./materials-filter-sheet";

const SORT_OPTIONS: SortOption[] = Object.entries(MATERIALS_SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

const IDS = getAdminDrawerIds("materials");

/**
 * Sous-header sticky (mobile, admin) pour la liste matériaux.
 * 4 actions : Filtrer | Rechercher | Ajouter | Trier.
 */
function MaterialsBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "filter">();
	const { hasActiveSort, activeFilterCount } = useActiveListControls();

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
			kind: "link",
			key: "add",
			icon: Plus,
			label: "Ajouter",
			ariaLabel: "Créer un nouveau matériau",
			href: "/admin/catalogue/materiaux/nouveau",
			viewTransitionName: "admin-add-action",
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
	];

	return (
		<>
			<StickyActionBar
				items={items}
				ariaLabel="Recherche, filtres, ajout et tri"
				search={
					<SearchInput
						size="sm"
						paramName="search"
						placeholder="Une matière à l'atelier…"
						aria-label="Rechercher une matière à l'atelier"
						className="w-full"
					/>
				}
			/>

			<MaterialsFilterSheet
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

export function MaterialsBottomBar() {
	return (
		<Suspense fallback={null}>
			<MaterialsBottomBarInner />
		</Suspense>
	);
}
