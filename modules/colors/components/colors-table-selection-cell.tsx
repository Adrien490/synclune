"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface ColorsTableSelectionCellProps {
	type: "header" | "row";
	colorIds?: string[];
	colorId?: string;
}

export function ColorsTableSelectionCell({
	type,
	colorIds,
	colorId,
}: ColorsTableSelectionCellProps) {
	if (type === "header" && colorIds) {
		return <SelectAllCheckbox itemIds={colorIds} />;
	}

	if (type === "row" && colorId) {
		return <ItemCheckbox itemId={colorId} />;
	}

	return null;
}
