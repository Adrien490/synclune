"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { RefundSelectionActions } from "./refund-selection-actions";

interface RefundsSelectionToolbarProps {
	pageItemIds?: string[];
}

export function RefundsSelectionToolbar({ pageItemIds }: RefundsSelectionToolbarProps = {}) {
	const { selectedItems } = useSelectionContext();

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar pageItemIds={pageItemIds}>
			<span className="text-muted-foreground text-sm">
				{selectedItems.length} remboursement{selectedItems.length > 1 ? "s" : ""} sélectionné
				{selectedItems.length > 1 ? "s" : ""}
			</span>
			<RefundSelectionActions />
		</SelectionToolbar>
	);
}
