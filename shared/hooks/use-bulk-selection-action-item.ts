"use client";

import { CheckSquare, Square } from "lucide-react";

import { useBulkSelectionContextOptional } from "@/shared/components/data-table";
import type { ActionMenuItem } from "@/shared/components/responsive-action-menu";

/**
 * Returns an `ActionMenuItem` ready to inject in any `use*Actions.ts` row menu
 * to add the current item to the bulk selection (and enter selection mode if
 * needed). Returns `null` when no `BulkSelectionProvider` is mounted in the
 * tree — caller filters out null and the menu is unaffected.
 *
 * Cas d'usage : depuis le menu actions d'une ligne (drawer mobile détail / 3-dots
 * desktop), permettre d'ajouter cet item au bulk **sans** fermer la liste.
 */
export function useBulkSelectionActionItem(id: string): ActionMenuItem | null {
	const ctx = useBulkSelectionContextOptional();
	if (!ctx) return null;

	const selected = ctx.isSelected(id);
	return {
		key: "select-item",
		label: selected ? "Retirer de la sélection" : "Sélectionner",
		icon: selected ? Square : CheckSquare,
		haptic: "selection",
		onSelect: () => {
			if (!ctx.selectionMode) ctx.enterSelectionMode();
			ctx.toggle(id);
		},
	};
}
