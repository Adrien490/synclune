"use client";

import { Suspense } from "react";
import { ArrowsDownUpIcon, PlusIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/ssr";

import { SearchInput } from "@/shared/components/search-input";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { TaxonomyFilterSheet } from "./taxonomy-filter-sheet";
import { TAXONOMY_CONFIG } from "../config/taxonomy.config";
import type { TaxonomyConfig, TaxonomyKind } from "../types/taxonomy.types";

/**
 * Sous-header sticky (mobile, admin) des listes de taxonomies.
 * Trois ou quatre actions : [Filtrer] | Rechercher | Ajouter | Trier.
 *
 * Le bouton « Filtrer » n'existe que si la taxonomie déclare des filtres — un
 * déclencheur pour une feuille vide est une promesse que la liste ne tient pas.
 */
function TaxonomyBottomBarInner({ config }: { config: TaxonomyConfig }) {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "filter">();
	const { hasActiveSort, activeFilterCount } = useActiveListControls();

	const ids = getAdminDrawerIds(config.drawerNamespace);
	const hasFilters = config.filters.length > 0;
	const sortOptions: SortOption[] = Object.entries(config.sortLabels).map(([value, label]) => ({
		value,
		label,
	}));

	const filterItem: StickyActionBarItem = {
		key: "filter",
		icon: SlidersHorizontalIcon,
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
	};

	const items: StickyActionBarItem[] = [
		...(hasFilters ? [filterItem] : []),
		{
			kind: "link",
			key: "add",
			icon: PlusIcon,
			label: "Ajouter",
			ariaLabel: config.createAriaLabel,
			href: `${config.basePath}/nouveau`,
			viewTransitionName: "admin-add-action",
		},
		{
			key: "sort",
			icon: ArrowsDownUpIcon,
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
				ariaLabel={hasFilters ? "Recherche, filtres, ajout et tri" : "Recherche, ajout et tri"}
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

			{hasFilters && (
				<TaxonomyFilterSheet
					config={config}
					open={isOpen("filter")}
					onOpenChange={onOpenChange("filter")}
					hideTrigger
					id={ids.filter}
				/>
			)}

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

/** Prend un `kind` — cf. la ⚠️ de `TaxonomyKind` (frontière RSC). */
export function TaxonomyBottomBar({ kind }: { kind: TaxonomyKind }) {
	return (
		<Suspense fallback={null}>
			<TaxonomyBottomBarInner config={TAXONOMY_CONFIG[kind]} />
		</Suspense>
	);
}
