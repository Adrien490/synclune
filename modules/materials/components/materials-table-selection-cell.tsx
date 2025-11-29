"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface MaterialsTableSelectionCellProps {
	type: "header" | "row";
	materialIds?: string[];
	materialId?: string;
}

export function MaterialsTableSelectionCell({
	type,
	materialIds,
	materialId,
}: MaterialsTableSelectionCellProps) {
	if (type === "header" && materialIds) {
		return <SelectAllCheckbox itemIds={materialIds} />;
	}

	if (type === "row" && materialId) {
		return <ItemCheckbox itemId={materialId} />;
	}

	return null;
}
