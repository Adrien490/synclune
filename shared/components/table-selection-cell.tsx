"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface TableSelectionCellProps {
	type: "header" | "row";
	/** IDs de tous les items pour le header (SelectAll) */
	itemIds?: string[];
	/** ID de l'item pour la row */
	itemId?: string;
	/** Label d'accessibilite pour la checkbox de row */
	ariaLabel?: string;
}

/**
 * Composant generique pour les cellules de selection dans les tables
 * Remplace les variantes specifiques par module
 */
export function TableSelectionCell({
	type,
	itemIds,
	itemId,
	ariaLabel,
}: TableSelectionCellProps) {
	if (type === "header" && itemIds) {
		return <SelectAllCheckbox itemIds={itemIds} />;
	}

	if (type === "row" && itemId) {
		return <ItemCheckbox itemId={itemId} ariaLabel={ariaLabel} />;
	}

	return null;
}
