"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface UsersTableSelectionCellProps {
	type: "header" | "row";
	userIds?: string[];
	userId?: string;
}

export function UsersTableSelectionCell({
	type,
	userIds,
	userId,
}: UsersTableSelectionCellProps) {
	if (type === "header" && userIds) {
		return <SelectAllCheckbox itemIds={userIds} />;
	}

	if (type === "row" && userId) {
		return <ItemCheckbox itemId={userId} />;
	}

	return null;
}
