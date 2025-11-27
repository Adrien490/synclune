"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface OrdersTableSelectionCellProps {
	type: "header" | "row";
	orderIds?: string[];
	orderId?: string;
}

export function OrdersTableSelectionCell({
	type,
	orderIds,
	orderId,
}: OrdersTableSelectionCellProps) {
	if (type === "header" && orderIds) {
		return <SelectAllCheckbox itemIds={orderIds} />;
	}

	if (type === "row" && orderId) {
		return <ItemCheckbox itemId={orderId} />;
	}

	return null;
}
