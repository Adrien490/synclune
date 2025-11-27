"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface CollectionsTableSelectionCellProps {
	type: "header" | "row";
	collectionIds?: string[];
	collectionId?: string;
}

export function CollectionsTableSelectionCell({
	type,
	collectionIds,
	collectionId,
}: CollectionsTableSelectionCellProps) {
	if (type === "header" && collectionIds) {
		return <SelectAllCheckbox itemIds={collectionIds} />;
	}

	if (type === "row" && collectionId) {
		return <ItemCheckbox itemId={collectionId} />;
	}

	return null;
}
