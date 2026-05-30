"use client";

import { Suspense } from "react";
import { ArrowUpDown, Plus, SlidersHorizontal } from "lucide-react";

import { SearchInput } from "@/shared/components/search-input";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	StickyActionBar,
	type StickyActionBarItem,
	useSelectionToggleItem,
} from "@/shared/components/sticky-action-bar";
import { getAdminDrawerIds } from "@/shared/constants/admin-drawer-ids";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { SORT_LABELS } from "../../constants/refund.constants";
import { RefundsFilterSheet } from "./refunds-filter-sheet";
import { REFUND_ORDER_PICKER_DIALOG_ID } from "./refund-order-picker-dialog";

const SORT_OPTIONS: SortOption[] = Object.entries(SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

const IDS = getAdminDrawerIds("refunds");

/**
 * Sous-header sticky (mobile, admin) pour la liste remboursements.
 * 3 actions : Filtrer | Rechercher | Trier.
 */
function RefundsBottomBarInner() {
	const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort" | "filter">();
	const { hasActiveSort, activeFilterCount } = useActiveListControls();
	const { open: openOrderPicker } = useDialog(REFUND_ORDER_PICKER_DIALOG_ID);

	const selectItem = useSelectionToggleItem();

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
			key: "create",
			icon: Plus,
			label: "Rembourser",
			ariaLabel: "Créer un remboursement",
			onClick: () => openOrderPicker(),
			haspopup: "dialog",
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
		...(selectItem ? [selectItem] : []),
	];

	return (
		<>
			<StickyActionBar
				items={items}
				ariaLabel="Recherche, filtres et tri"
				search={
					<SearchInput
						size="sm"
						paramName="search"
						placeholder="Numéro de commande, email…"
						aria-label="Rechercher un remboursement"
						className="w-full"
					/>
				}
			/>

			<RefundsFilterSheet
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

export function RefundsBottomBar() {
	return (
		<Suspense fallback={null}>
			<RefundsBottomBarInner />
		</Suspense>
	);
}
