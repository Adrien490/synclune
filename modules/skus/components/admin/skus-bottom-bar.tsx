"use client";

import { Suspense, type ComponentProps } from "react";
import { ArrowUpDown, Plus, SlidersHorizontal } from "lucide-react";

import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import { GET_PRODUCT_SKUS_SORT_FIELDS, SORT_LABELS } from "../../constants/sku.constants";
import { SkusFilterSheet } from "./skus-filter-sheet";

import type { ColorOption } from "@/modules/colors/data/get-color-options";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

const SORT_OPTIONS: SortOption[] = GET_PRODUCT_SKUS_SORT_FIELDS.map((field) => ({
	value: field,
	label: SORT_LABELS[field] ?? field,
}));

interface SkusBottomBarProps {
	productSlug: string;
	colorOptions: ColorOption[];
	materialOptions: MaterialOption[];
}

/**
 * Sous-header sticky (mobile, admin) pour la liste des variantes.
 *
 * 3 actions : Filtrer | Ajouter | Trier. La barre reste collée sous le header
 * admin au scroll. Pas de bouton Recherche : aucun adapter quick-search SKU
 * n'existe encore côté admin (la SearchInput URL-driven du Toolbar desktop
 * suffit, et les listes de variantes par produit sont typiquement <50 lignes).
 */
function SkusBottomBarInner({ productSlug, colorOptions, materialOptions }: SkusBottomBarProps) {
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
			ariaLabel: "Créer une nouvelle variante",
			href: `/admin/catalogue/produits/${productSlug}/variantes/nouveau`,
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
			expanded: isOpen("sort"),
			announcement: hasActiveSort ? "Tri actif" : undefined,
		},
	];

	return (
		<>
			<StickyActionBar items={items} ariaLabel="Filtres, ajout et tri" />

			<SkusFilterSheet
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				hideTrigger
				colorOptions={colorOptions}
				materialOptions={materialOptions}
			/>

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
			/>
		</>
	);
}

export function SkusBottomBar(props: ComponentProps<typeof SkusBottomBarInner>) {
	return (
		<Suspense fallback={null}>
			<SkusBottomBarInner {...props} />
		</Suspense>
	);
}
