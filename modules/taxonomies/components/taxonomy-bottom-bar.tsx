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
		},
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

/**
 * ⚠️ Prend un `kind` (chaîne), pas l'objet `config`.
 *
 * Ce composant est `"use client"` et monté depuis des Server Components : un
 * `TaxonomyConfig` passé en prop traverserait la frontière RSC — ~40 champs
 * sérialisés à chaque rendu, pour une valeur que le client peut lire seul dans
 * le registre. Le `kind` fait cinq caractères sur le fil.
 *
 * C'est aussi ce qui a permis de supprimer les fichiers-liants d'un composant
 * (`colors-bottom-bar.tsx` et ses quatorze jumeaux, 8 à 13 lignes chacun) dont
 * le corps entier était `return <Taxonomy… config={TAXONOMY_CONFIG.x} />`.
 */
export function TaxonomyBottomBar({ kind }: { kind: TaxonomyKind }) {
	return (
		<Suspense fallback={null}>
			<TaxonomyBottomBarInner config={TAXONOMY_CONFIG[kind]} />
		</Suspense>
	);
}
