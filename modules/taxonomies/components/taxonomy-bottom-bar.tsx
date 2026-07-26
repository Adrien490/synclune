"use client";

import { Suspense } from "react";
import { ArrowUpDown, Plus, SlidersHorizontal } from "lucide-react";

import { SearchInput } from "@/shared/components/search-input";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { TaxonomyFilterSheet } from "./taxonomy-filter-sheet";
import type { TaxonomyConfig } from "../types/taxonomy.types";

/**
 * Sous-header sticky (mobile, admin) des listes de taxonomies.
 * Quatre actions : Filtrer | Rechercher | Ajouter | Trier.
 */
function TaxonomyBottomBarInner({ config }: { config: TaxonomyConfig }) {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "filter">();
	const { hasActiveSort, activeFilterCount } = useActiveListControls();

	const ids = getAdminDrawerIds(config.drawerNamespace);
	const sortOptions: SortOption[] = Object.entries(config.sortLabels).map(([value, label]) => ({
		value,
		label,
	}));

	const items: StickyActionBarItem[] = [
		{
			key: "filter",
			icon: SlidersHorizontal,
			label: "Filtrer",
			ariaLabel: "Ouvrir les filtres",
			onClick: () => open("filter"),
			badgeCount: activeFilterCount,
			haspopup: "dialog",
			controls: ids.filter,
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
			ariaLabel: config.createAriaLabel,
			href: `${config.basePath}/nouveau`,
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
			controls: ids.sort,
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
						placeholder={config.search.placeholder}
						aria-label={config.search.ariaLabel}
						className="w-full"
					/>
				}
			/>

			<TaxonomyFilterSheet
				config={config}
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				hideTrigger
				id={ids.filter}
			/>

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={sortOptions}
				showResetOption
				id={ids.sort}
			/>
		</>
	);
}

export function TaxonomyBottomBar({ config }: { config: TaxonomyConfig }) {
	return (
		<Suspense fallback={null}>
			<TaxonomyBottomBarInner config={config} />
		</Suspense>
	);
}
