"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface SubscribersTableSelectionCellProps {
	type: "header" | "row";
	subscriberIds?: string[];
	subscriberId?: string;
}

export function SubscribersTableSelectionCell({
	type,
	subscriberIds,
	subscriberId,
}: SubscribersTableSelectionCellProps) {
	if (type === "header" && subscriberIds) {
		return <SelectAllCheckbox itemIds={subscriberIds} />;
	}

	if (type === "row" && subscriberId) {
		return <ItemCheckbox itemId={subscriberId} />;
	}

	return null;
}
