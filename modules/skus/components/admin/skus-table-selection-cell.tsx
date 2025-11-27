"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface ProductVariantsTableSelectionCellProps {
	type: "header" | "row";
	variantIds?: string[];
	variantId?: string;
}

export function ProductVariantsTableSelectionCell({
	type,
	variantIds,
	variantId,
}: ProductVariantsTableSelectionCellProps) {
	if (type === "header" && variantIds) {
		return <SelectAllCheckbox itemIds={variantIds} />;
	}

	if (type === "row" && variantId) {
		return <ItemCheckbox itemId={variantId} />;
	}

	return null;
}
