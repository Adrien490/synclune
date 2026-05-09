"use client";

import { Suspense, type ComponentProps } from "react";
import { ArrowUpDown, Plus, Search, SlidersHorizontal } from "lucide-react";

import { AdminSearchDrawerTop } from "@/shared/components/admin-search-drawer-top";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { StickyActionBar, type StickyActionBarItem } from "@/shared/components/sticky-action-bar";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";

import {
	ADMIN_PRODUCTS_SORT_LABELS,
	GET_PRODUCTS_SORT_FIELDS,
} from "../../constants/product.constants";
import { ProductsFilterSheet } from "./products-filter-sheet";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

const SORT_OPTIONS: SortOption[] = GET_PRODUCTS_SORT_FIELDS.map((field) => ({
	value: field,
	label: ADMIN_PRODUCTS_SORT_LABELS[field] ?? field,
}));

interface ProductsBottomBarProps {
	productTypes: Array<{ id: string; label: string; slug: string }>;
	collections: Array<{ id: string; name: string }>;
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	maxPriceInCents: number;
}

/**
 * Sous-header sticky (mobile, admin) pour la liste produits.
 *
 * 4 actions : Filtrer | Rechercher | Ajouter | Trier. Reproduit le pattern
 * `ProductSortBar` de la boutique : la barre reste collée sous le header admin
 * au scroll. L'ancienne bottom-bar a migré en haut de page ; la nav globale
 * `AdminMobileBottomBar` reste visible en bas simultanément.
 */
function ProductsBottomBarInner({
	productTypes,
	collections,
	colors,
	materials,
	maxPriceInCents,
}: ProductsBottomBarProps) {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "search" | "filter">();
	const { hasActiveSearch, searchValue, hasActiveSort, activeFilterCount } =
		useActiveListControls();

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
			key: "search",
			icon: Search,
			label: "Rechercher",
			ariaLabel: hasActiveSearch
				? `Recherche: "${searchValue}". Modifier la recherche`
				: "Ouvrir la recherche",
			onClick: () => open("search"),
			active: hasActiveSearch,
			haspopup: "dialog",
			expanded: isOpen("search"),
			announcement: hasActiveSearch ? `Recherche "${searchValue}" active` : undefined,
		},
		{
			kind: "link",
			key: "add",
			icon: Plus,
			label: "Ajouter",
			ariaLabel: "Créer un nouveau produit",
			href: "/admin/catalogue/produits/nouveau",
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
			<StickyActionBar items={items} ariaLabel="Filtres, recherche, ajout et tri" />

			<ProductsFilterSheet
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				hideTrigger
				productTypes={productTypes}
				collections={collections}
				colors={colors}
				materials={materials}
				maxPriceInCents={maxPriceInCents}
			/>

			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
			/>

			<AdminSearchDrawerTop
				open={isOpen("search")}
				onOpenChange={onOpenChange("search")}
				placeholder="Rechercher par titre…"
				ariaLabel="Rechercher un produit par titre"
			/>
		</>
	);
}

export function ProductsBottomBar(props: ComponentProps<typeof ProductsBottomBarInner>) {
	return (
		<Suspense fallback={null}>
			<ProductsBottomBarInner {...props} />
		</Suspense>
	);
}
