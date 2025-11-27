"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface ProductTypesTableSelectionCellProps {
	type: "header" | "row";
	productTypeIds?: string[];
	productTypeId?: string;
}

export function ProductTypesTableSelectionCell({
	type,
	productTypeIds,
	productTypeId,
}: ProductTypesTableSelectionCellProps) {
	if (type === "header" && productTypeIds) {
		return <SelectAllCheckbox itemIds={productTypeIds} />;
	}

	if (type === "row" && productTypeId) {
		return <ItemCheckbox itemId={productTypeId} />;
	}

	return null;
}
