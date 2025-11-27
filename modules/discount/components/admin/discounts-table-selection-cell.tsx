"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface DiscountsTableSelectionCellProps {
	type: "header" | "row";
	discountIds?: string[];
	discountId?: string;
}

export function DiscountsTableSelectionCell({
	type,
	discountIds,
	discountId,
}: DiscountsTableSelectionCellProps) {
	if (type === "header" && discountIds) {
		return <SelectAllCheckbox itemIds={discountIds} />;
	}

	if (type === "row" && discountId) {
		return <ItemCheckbox itemId={discountId} />;
	}

	return null;
}
