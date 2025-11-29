"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface StockNotificationsTableSelectionCellProps {
	type: "header" | "row";
	notificationIds?: string[];
	notificationId?: string;
}

export function StockNotificationsTableSelectionCell({
	type,
	notificationIds,
	notificationId,
}: StockNotificationsTableSelectionCellProps) {
	if (type === "header" && notificationIds) {
		return <SelectAllCheckbox itemIds={notificationIds} />;
	}

	if (type === "row" && notificationId) {
		return <ItemCheckbox itemId={notificationId} />;
	}

	return null;
}
