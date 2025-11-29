"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface RefundsTableSelectionCellProps {
	type: "header" | "row";
	refundIds?: string[];
	refundId?: string;
}

export function RefundsTableSelectionCell({
	type,
	refundIds,
	refundId,
}: RefundsTableSelectionCellProps) {
	if (type === "header" && refundIds) {
		return <SelectAllCheckbox itemIds={refundIds} />;
	}

	if (type === "row" && refundId) {
		return <ItemCheckbox itemId={refundId} />;
	}

	return null;
}
