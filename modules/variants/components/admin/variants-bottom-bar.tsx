"use client";

import { Suspense, type ComponentProps } from "react";
import { ArrowsDownUpIcon, PlusIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/ssr";

import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { GET_PRODUCT_VARIANTS_SORT_FIELDS, SORT_LABELS } from "../../constants/variant.constants";
import { VariantsFilterSheet } from "./variants-filter-sheet";

import type { ColorOption } from "@/modules/colors/data/get-color-options";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

const SORT_OPTIONS: SortOption[] = GET_PRODUCT_VARIANTS_SORT_FIELDS.map((field) => ({
	value: field,
	label: SORT_LABELS[field] ?? field,
}));

const IDS = getAdminDrawerIds("variants");

interface VariantsBottomBarProps {
	productSlug: string;
	colorOptions: ColorOption[];
	materialOptions: MaterialOption[];
}

/**
 * Sous-header sticky (mobile, admin) pour la liste des variantes.
 *
 * 3 actions : Filtrer | Ajouter | Trier. La barre reste collée sous le header
 * admin au scroll. Pas de bouton Recherche : aucun adapter quick-search VARIANT
 * n'existe encore côté admin (la SearchInput URL-driven du Toolbar desktop
 * suffit, et les listes de variantes par produit sont typiquement <50 lignes).
 */
function VariantsBottomBarInner({
	productSlug,
	colorOptions,
	materialOptions,
}: VariantsBottomBarProps) {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "filter">();
	const { hasActiveSort, activeFilterCount } = useActiveListControls();

	const items: StickyActionBarItem[] = [
		{
			key: "filter",
			icon: SlidersHorizontalIcon,
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
			icon: PlusIcon,
			label: "Ajouter",
			ariaLabel: "Créer une nouvelle variante",
			href: `/admin/catalogue/produits/${productSlug}/variantes/nouveau`,
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
			controls: IDS.sort,
			expanded: isOpen("sort"),
			announcement: hasActiveSort ? "Tri actif" : undefined,
		},
	];

	return (
		<>
			<StickyActionBar items={items} ariaLabel="Filtres, ajout et tri" />

			<VariantsFilterSheet
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				hideTrigger
				id={IDS.filter}
				colorOptions={colorOptions}
				materialOptions={materialOptions}
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

export function VariantsBottomBar(props: ComponentProps<typeof VariantsBottomBarInner>) {
	return (
		<Suspense fallback={null}>
			<VariantsBottomBarInner {...props} />
		</Suspense>
	);
}
