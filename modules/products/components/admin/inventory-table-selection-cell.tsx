"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface InventoryTableSelectionCellProps {
	type: "header" | "row";
	inventoryIds?: string[];
	inventoryId?: string;
}

export function InventoryTableSelectionCell({
	type,
	inventoryIds,
	inventoryId,
}: InventoryTableSelectionCellProps) {
	if (type === "header" && inventoryIds) {
		return <SelectAllCheckbox itemIds={inventoryIds} />;
	}

	if (type === "row" && inventoryId) {
		return <ItemCheckbox itemId={inventoryId} />;
	}

	return null;
}
